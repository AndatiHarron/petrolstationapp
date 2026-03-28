<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LockShiftRequest;
use App\Http\Resources\ClosingShiftResource;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\ShiftResource;
use App\Models\Invoice;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Services\ShiftReconciliationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ShiftController extends Controller
{
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

        $shift = Shift::create([
            'station_id' => $stationId,
            'started_by_user_id' => Auth::id(),
            'started_at' => now(),
            'status' => 'OPEN',
        ]);

        $shift->load(['station', 'meterReadings.nozzle', 'dipReadings.tank', 'payments', 'creditSales.customer']);

        return new ShiftResource($shift);
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

        try {
            $formattedMeters = [];
            foreach ($request->input('meters') as $index => $meterData) {
                $evidencePath = null;

                if ($request->hasFile("meters.{$index}.evidence")) {
                    $file = $request->file("meters.{$index}.evidence");
                    $evidencePath = $file->store('meter-evidence', 'public');
                }

                $formattedMeters[] = [
                    'nozzle_id' => $meterData['nozzle_id'],
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

        } catch (\Exception $e) {
            Log::error('Shift Lock Error: '.$e->getMessage());

            return response()->json([
                'error' => $e->getMessage(),
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
            $invoiceNumber = 'INV-'.strtoupper(Str::random(8));

            // Ensure unique invoice number
            while (Invoice::where('invoice_number', $invoiceNumber)->exists()) {
                $invoiceNumber = 'INV-'.strtoupper(Str::random(8));
            }

            $pdf = Pdf::loadView('pdfs.invoice', [
                'organization_name' => $shift->organization->name ?? 'N/A',
                'station_name' => $shift->station->name ?? 'N/A',
                'invoice_number' => $invoiceNumber,
                'customer_name' => $customer->name,
                'date' => ($shift->locked_at ?? now())->format('Y-m-d'),
                'shift_id' => $shift->id,
                'sales' => $sales,
                'total_amount' => $totalAmount,
            ]);

            $path = "invoices/{$invoiceNumber}.pdf";
            Storage::disk('local')->put($path, $pdf->output());

            $invoice = Invoice::create([
                'organization_id' => $shift->organization_id,
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
