<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\FiltersByStation;
use App\Exceptions\ShiftReconciliationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\LockShiftRequest;
use App\Http\Resources\ClosingShiftResource;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\ShiftResource;
use App\Models\Invoice;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Station;
use App\Services\ShiftReconciliationService;
use App\Services\ShiftScheduleService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ShiftController extends Controller
{
    use FiltersByStation;

    public function __construct(protected ShiftReconciliationService $reconciliationService) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Shift::class);

        $query = Shift::with(['station', 'meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer']);

        if (Auth::user()->hasRole('manager') && Auth::user()->station_id) {
            $query->where('station_id', Auth::user()->station_id);
        }

        // An administrator narrowing the company view to one station.
        $query->when(
            $this->requestedStationId($request),
            fn ($q, $stationId) => $q->where('station_id', $stationId)
        );

        $shifts = $query->latest()->paginate();

        return ShiftResource::collection($shifts);
    }

    /**
     * Display the current active shift for the authenticated user.
     */
    public function current(Request $request)
    {
        $shift = Shift::where('started_by_user_id', Auth::id())
            ->where('status', 'OPEN')
            ->with(['station', 'meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer'])
            ->first();

        if (! $shift) {
            return response()->json([
                'message' => 'No active shift found.',
            ], 404);
        }

        return new ShiftResource($shift);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Check if a user already has an open shift
        $existing = Shift::where('started_by_user_id', Auth::id())
            ->where('status', 'OPEN')
            ->first();

        if ($existing) {
            $existing->load(['station', 'meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer']);

            return new ShiftResource($existing);
        }

        // 2. Create the Shift
        $stationId = Auth::user()->station_id;

        if (! $stationId) {
            return response()->json([
                'message' => 'User is not assigned to a station.',
            ], 400);
        }

        $hasNozzles = Nozzle::where('station_id', $stationId)->exists();

        if (! $hasNozzles) {
            return response()->json([
                'message' => 'Cannot start shift: no nozzles are configured for this station.',
            ], 422);
        }

        // Which of the station's shifts this is, and when it is due to end.
        //
        // Resolved once, here, and stored — rather than worked out from the
        // pattern whenever it is needed. An admin may edit the pattern later,
        // and a shift has to be judged against the hours it was actually opened
        // under, not the hours the station keeps now.
        $station = Station::find($stationId);
        $scheduled = app(ShiftScheduleService::class)->resolve($station);

        $shift = Shift::create([
            'station_id' => $stationId,
            'started_by_user_id' => Auth::id(),
            'started_at' => now(),
            'status' => 'OPEN',
            'shift_schedule_id' => $scheduled['schedule']?->id,
            'scheduled_end_at' => $scheduled['ends_at'],
        ]);

        $shift->load(['station', 'meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer']);

        return new ShiftResource($shift);
    }

    /**
     * Remove photos uploaded for a close that was then refused.
     *
     * Best effort: a failure to tidy up must not replace the real reason the
     * close was refused, which is what the person at the pump needs to see.
     *
     * @param  list<string>  $paths
     */
    private function discardUploads(array $paths): void
    {
        foreach ($paths as $path) {
            try {
                Storage::disk()->delete($path);
            } catch (\Throwable $e) {
                Log::warning('Could not remove orphaned meter evidence', [
                    'path' => $path,
                    'reason' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Lock a Shift
     * * Submits final readings, evidence, and payments to close a shift.
     * Calculates variance immediately.
     */
    public function lock(LockShiftRequest $request, Shift $shift)
    {
        if ($shift->started_by_user_id != Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        // Before anything is uploaded or written: a shift that is not due to
        // end yet cannot be closed by the person working it. Checked here so a
        // refusal costs nothing and leaves no photographs behind.
        try {
            app(ShiftScheduleService::class)->assertMayClose($shift, Auth::user());
        } catch (ShiftReconciliationException $e) {
            return response()->json([
                'error' => 'shift_not_due',
                'message' => $e->getMessage(),
            ], 422);
        }

        // Photos are stored before reconciliation runs, so anything already
        // uploaded has to be removed if the close is then refused — otherwise
        // every rejected attempt leaves an object in the bucket that no row
        // points at, and the integrity checks make rejection a normal event.
        $uploadedPaths = [];

        try {
            $formattedMeters = [];
            foreach ($request->input('meters') as $index => $meterData) {
                $evidencePath = null;

                if ($request->hasFile("meters.{$index}.evidence")) {
                    $file = $request->file("meters.{$index}.evidence");

                    // The configured default disk, not a hardcoded 'public'.
                    // Naming the local disk here meant FILESYSTEM_DISK was
                    // ignored, so evidence went to the container's own
                    // filesystem and was destroyed on the next deployment.
                    $evidencePath = $file->store('meter-evidence');

                    // The disk runs with throw => false, so a failed upload
                    // returns false instead of raising. Accepting that would
                    // lock the shift with no photo and no record that one was
                    // meant to be there — the reading would look as though
                    // evidence was never offered. Refuse instead: the person
                    // closing the shift is still standing at the pump and can
                    // retry, which is the only moment the photo can be retaken.
                    if ($evidencePath === false) {
                        Log::error('Meter evidence upload failed', [
                            'shift_id' => $shift->id,
                            'nozzle_id' => $meterData['nozzle_id'] ?? null,
                            'disk' => config('filesystems.default'),
                        ]);

                        $this->discardUploads($uploadedPaths);

                        return response()->json([
                            'error' => 'evidence_upload_failed',
                            'message' => 'The meter photo could not be saved, so the shift was not closed. Check the connection and try again.',
                        ], 503);
                    }

                    $uploadedPaths[] = $evidencePath;
                }

                $formattedMeters[] = [
                    'nozzle_id' => $meterData['nozzle_id'],
                    // Forwarded so it can be checked against the reading the
                    // last shift closed on. This was collected from the person
                    // at the pump, validated, and then dropped here, so a
                    // mismatch between what is on the pump and what the system
                    // believes could never be detected.
                    'opening_reading' => $meterData['opening_reading'] ?? null,
                    'closing_reading' => $meterData['closing_reading'],
                    'evidence_path' => $evidencePath,
                    'gps_coordinates' => json_decode($meterData['gps_coordinates'] ?? '{}', true),
                ];
            }

            $formattedDips = [];
            foreach ($request->input('dips') as $dipData) {
                $formattedDips[] = [
                    'tank_id' => $dipData['tank_id'],
                    'dip_mm' => $dipData['dip_mm'],
                ];
            }

            $payments = $request->input('payments', []);

            $updatedShift = $this->reconciliationService->reconcile(
                $shift,
                $formattedMeters,
                $formattedDips,
                $payments
            );

            $updatedShift->load(['meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer']);

            return new ShiftResource($updatedShift);

        } catch (ShiftReconciliationException $e) {
            // The shift stays open, so the photos belong to nothing.
            $this->discardUploads($uploadedPaths);

            // A rule refused this, and the person at the pump can act on it.
            // 422 rather than 500, and the reason under `message`, which is the
            // key the clients read — it used to be sent as `error` beside a 500,
            // so the supervisor saw a bare status code and a button that looked
            // like it did nothing.
            Log::info('Shift close refused: '.$e->getMessage());

            return response()->json([
                'error' => 'shift_not_reconciled',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            $this->discardUploads($uploadedPaths);

            Log::error('Shift Lock Error: '.$e->getMessage(), ['exception' => $e]);

            return response()->json([
                'error' => 'shift_lock_failed',
                'message' => 'The shift could not be closed because of an unexpected error. Nothing was saved — try again.',
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Shift $shift): ShiftResource
    {
        Gate::authorize('view', $shift);

        $shift->load(['meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer', 'station']);

        return new ShiftResource($shift);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    /**
     * Get closing data for the purpose of closing a shift
     */
    public function closingData(Request $request, Shift $shift)
    {
        if ($shift->started_by_user_id != Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        $shift->load([
            'station.nozzles.tank.product',
            'station.tanks.product',
            'meterReadings',
            'dipReadings',
        ]);

        return new ClosingShiftResource($shift);
    }

    /**
     * Get invoice data for a locked shift
     */
    public function invoiceData(Request $request, Shift $shift)
    {
        Gate::authorize('view', $shift);

        if ($shift->status !== Shift::STATUS_LOCKED && $shift->status !== Shift::STATUS_APPROVED) {
            return response()->json(['message' => 'Shift must be locked to fetch invoice data.'], 422);
        }

        $invoiceData = $shift->creditSales()
            ->with('customer')
            ->get()
            ->groupBy('customer_id')
            ->map(function ($sales) {
                $customer = $sales->first()->customer;

                return [
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'total_amount' => $sales->sum('amount'),
                    'sales' => $sales->map(fn ($sale) => [
                        'id' => $sale->id,
                        'amount' => $sale->amount,
                        'vehicle_reg' => $sale->vehicle_reg,
                        'notes' => $sale->notes,
                        'created_at' => $sale->created_at,
                    ]),
                ];
            })->values();

        return response()->json(['data' => $invoiceData]);
    }

    /**
     * Get generated invoices for a locked shift
     */
    public function invoices(Request $request, Shift $shift)
    {
        Gate::authorize('view', $shift);

        $invoices = $shift->invoices()->with('customer')->get();

        return InvoiceResource::collection($invoices);
    }

    /**
     * Generate PDF invoices for a locked shift
     */
    public function generateInvoices(Request $request, Shift $shift)
    {
        Gate::authorize('view', $shift);

        if ($shift->status !== Shift::STATUS_LOCKED && $shift->status !== Shift::STATUS_APPROVED) {
            return response()->json(['message' => 'Shift must be locked to generate invoices.'], 422);
        }

        $shift->load(['organization', 'station']);

        $salesByCustomer = $shift->creditSales()
            ->with('customer')
            ->get()
            ->groupBy('customer_id');

        $generatedInvoices = [];

        foreach ($salesByCustomer as $customerId => $sales) {
            // Idempotency: Check if invoice already exists for this shift and customer
            $existingInvoice = Invoice::where('shift_id', $shift->id)
                ->where('customer_id', $customerId)
                ->first();

            if ($existingInvoice) {
                $generatedInvoices[] = $existingInvoice;

                continue;
            }

            $customer = $sales->first()->customer;
            $totalAmount = $sales->sum('amount');
            // DDMMYYYY-NNN, dated to when the shift was locked and incrementing
            // within that day.
            $invoiceNumber = Invoice::nextInvoiceNumber($shift->locked_at ?? now());

            $pdf = Pdf::loadView('pdfs.invoice', [
                'organization_name' => $shift->organization->name ?? 'N/A',
                'station_name' => $shift->station->name ?? 'N/A',
                'invoice_number' => $invoiceNumber,
                'customer_name' => $customer->name,
                'date' => ($shift->locked_at ?? now())->format('Y-m-d'),
                'shift_id' => $shift->shift_number ?? $shift->id,
                'sales' => $sales,
                'total_amount' => $totalAmount,
            ]);

            $path = "invoices/{$invoiceNumber}.pdf";
            Storage::disk('local')->put($path, $pdf->output());

            $invoice = Invoice::create([
                'organization_id' => $shift->organization_id,
                // The foreign key takes the UUID; only the printed PDF quotes the
                // human-readable shift_number.
                'shift_id' => $shift->id,
                'customer_id' => $customerId,
                'invoice_number' => $invoiceNumber,
                'total_amount' => $totalAmount,
                'pdf_path' => $path,
            ]);

            $generatedInvoices[] = $invoice;
        }

        return response()->json([
            'message' => count($generatedInvoices).' invoices generated successfully.',
            'invoices' => $generatedInvoices,
        ]);
    }

    /**
     * Download a specific invoice
     */
    public function downloadInvoice(Invoice $invoice)
    {
        Gate::authorize('view', $invoice);

        if (! Storage::disk('local')->exists($invoice->pdf_path)) {
            abort(404, 'Invoice file not found.');
        }

        return Storage::disk('local')->download($invoice->pdf_path);
    }
}
