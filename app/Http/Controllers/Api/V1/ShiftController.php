<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShiftResource;
use App\Models\Shift;
use App\Services\ShiftReconciliationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    public function __construct(protected ShiftReconciliationService $reconciliationService) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $shift = Shift::where('started_by_user_id', Auth::id())
            ->where('status', 'OPEN')
            ->first();

        if (!$shift) {
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
        // 1. Check if user already has an open shift
        $existing = Shift::where('started_by_user_id', Auth::id())
            ->where('status', 'OPEN')
            ->first();

        if($existing) {
            return new ShiftResource($existing);
        }

        // 2. Create the Shift
        $stationId = Auth::user()->station_id ?? 1;

        $shift = Shift::create([
            'station_id' => $stationId,
            'started_by_user_id' => Auth::id(),
            'started_at' => now(),
            'status' => 'OPEN',
        ]);

        return new ShiftResource($shift);
    }

    public function lock(Request $request, Shift $shift)
    {
        if($shift->started_by_user_id != Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'payments' => 'required|array',
            'payments.cash' => 'nullable|numeric|min:0',
            'payments.mpesa' => 'nullable|numeric|min:0',
            'payments.credit' => 'nullable|numeric|min:0',
            'meters' => 'required|array',
            'meters.*.nozzle_id' => 'required|exists:nozzles,id',
            'meters.*.opening_reading' => 'required|numeric',
            'meters.*.closing_reading' => 'required|numeric',
            'meters.*.evidence' => 'nullable|image|max:1520',
            'dips' => 'required|array',
            'dips.*.tank_id' => 'required|exists:tanks,id',
            'dips.*.dip_mm' => 'required|numeric',
        ]);

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

            $updatedShift->load(['meterReadings', 'dipReadings']);

            return new ShiftResource($updatedShift);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
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
}
