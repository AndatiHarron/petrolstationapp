<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\FiltersByStation;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEditRequestRequest;
use App\Http\Requests\UpdateEditRequestRequest;
use App\Http\Resources\EditRequestResource;
use App\Models\EditRequest;
use App\Models\Shift;
use App\Services\ShiftReconciliationService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

class EditRequestController extends Controller
{
    use FiltersByStation;

    /**
     * List Edit Requests
     */
    public function index(Request $request)
    {
        $query = EditRequest::query()->with(['user', 'approver']);

        if (! Auth::user()->hasRole('admin')) {
            $query->where('user_id', Auth::id());
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // An edit request has no station of its own. The member of staff who
        // raised it does, and that is the station it belongs to.
        $query->when(
            $this->requestedStationId($request),
            fn ($q, $stationId) => $q->whereHas(
                'user',
                fn ($u) => $u->where('station_id', $stationId)
            )
        );

        return EditRequestResource::collection($query->latest()->paginate(20));
    }

    /**
     * Create an Edit Request
     */
    public function store(StoreEditRequestRequest $request)
    {
        $validated = $request->validated();

        $modelClass = $validated['model_type'];
        $modelId = $validated['model_id'];

        if (! class_exists($modelClass)) {
            return response()->json(['message' => "Invalid model type: {$modelClass}"], 422);
        }

        $model = $modelClass::findOrFail($modelId);

        // Authorization check for the model being edited?
        // Usually anyone can request an edit, but let's assume they should at least be in the same org.
        if (isset($model->organization_id) && $model->organization_id !== Auth::user()->organization_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $requestedData = $validated['requested_data'];

        // If requested_data is sent as a list (e.g. from some mobile clients), take the first item.
        // It might be an associative array or a JSON string.
        if (array_is_list($requestedData) && ! empty($requestedData)) {
            $item = $requestedData[0];
            if (is_string($item)) {
                $item = json_decode($item, true) ?? $item;
            }
            if (is_array($item)) {
                $requestedData = $item;
            }
        }

        $editRequest = EditRequest::create([
            'user_id' => Auth::id(),
            'organization_id' => Auth::user()->organization_id,
            'model_type' => $modelClass,
            'model_id' => $modelId,
            'original_data' => $this->buildOriginalData($model, $requestedData),
            'requested_data' => $requestedData,
            'reason' => $validated['reason'] ?? null,
            'status' => 'pending',
        ]);

        return new EditRequestResource($editRequest->load(['user', 'approver']));
    }

    /**
     * Show Edit Request details
     */
    public function show(EditRequest $editRequest)
    {
        Gate::authorize('view', $editRequest);

        return new EditRequestResource($editRequest->load(['user', 'approver']));
    }

    /**
     * Approve or Reject an Edit Request
     */
    public function update(UpdateEditRequestRequest $request, EditRequest $editRequest)
    {
        Gate::authorize('update', $editRequest);

        if ($editRequest->status !== 'pending') {
            return response()->json(['message' => 'This request has already been processed.'], 422);
        }

        $validated = $request->validated();

        if ($validated['status'] === 'approved') {
            $this->applyApprovedChanges($editRequest);
            $editRequest->approved_at = now();
        } else {
            $editRequest->rejected_at = now();
        }

        $editRequest->status = $validated['status'];
        $editRequest->approver_id = Auth::id();
        $editRequest->comments = $validated['comments'] ?? null;
        $editRequest->save();

        return new EditRequestResource($editRequest->load(['user', 'approver']));
    }

    protected function applyApprovedChanges(EditRequest $editRequest): void
    {
        $model = $editRequest->model;
        $data = $editRequest->requested_data;

        // Handle legacy or wrongly formatted data that might be stored as a list
        if (array_is_list($data) && ! empty($data)) {
            $item = $data[0];
            if (is_string($item)) {
                $item = json_decode($item, true) ?? $item;
            }
            if (is_array($item)) {
                $data = $item;
            }
        }

        $isShift = $model instanceof Shift || get_class($model) === 'App\Models\Shift' || $model->getMorphClass() === 'App\Models\Shift';

        if ($isShift) {
            $this->applyShiftChanges($model, $data);
        } else {
            // Filter out keys that are not columns to avoid SQL errors
            $columns = Schema::getColumnListing($model->getTable());
            $updateData = array_intersect_key($data, array_flip($columns));

            if (! empty($updateData)) {
                $model->update($updateData);
            }
        }
    }

    protected function applyShiftChanges(Shift $shift, array $data): void
    {
        $meters = $data['meters'] ?? $data['readings'] ?? null;
        $dips = $data['dips'] ?? null;
        $payments = $data['payments'] ?? null;

        $formattedMeters = [];
        if ($meters) {
            foreach ($meters as $m) {
                $existing = $shift->meterReadings()->where('nozzle_id', $m['nozzle_id'])->first();
                $formattedMeters[] = [
                    'nozzle_id' => $m['nozzle_id'],
                    'opening_reading' => $m['opening_reading'] ?? ($existing ? $existing->opening_reading : null),
                    'closing_reading' => $m['closing_reading'],
                    'evidence_path' => $m['evidence_path'] ?? ($existing ? $existing->evidence_path : null),
                    'gps_coordinates' => $m['gps_coordinates'] ?? ($existing ? $existing->gps_coordinates : null),
                ];
            }
        } else {
            foreach ($shift->meterReadings as $m) {
                $formattedMeters[] = [
                    'nozzle_id' => $m->nozzle_id,
                    'opening_reading' => $m->opening_reading,
                    'closing_reading' => $m->closing_reading,
                    'evidence_path' => $m->evidence_path,
                    'gps_coordinates' => $m->gps_coordinates,
                ];
            }
        }

        $formattedDips = [];
        if ($dips) {
            foreach ($dips as $d) {
                $formattedDips[] = [
                    'tank_id' => $d['tank_id'],
                    'dip_mm' => $d['dip_mm'],
                ];
            }
        } else {
            foreach ($shift->dipReadings as $d) {
                $formattedDips[] = [
                    'tank_id' => $d->tank_id,
                    'dip_mm' => $d->dip_mm,
                ];
            }
        }

        $paymentsToUse = $payments;
        if (! $paymentsToUse) {
            $paymentsToUse = [
                'cash' => $shift->payments()->where('method', 'cash')->first()?->amount ?? 0,
                'mpesa' => $shift->payments()->where('method', 'mpesa')->first()?->amount ?? 0,
                'credit' => $shift->creditSales->map(fn ($cs) => [
                    'customer_id' => $cs->customer_id,
                    'amount' => $cs->amount,
                    'vehicle_reg' => $cs->vehicle_reg,
                ])->all(),
            ];
        }

        DB::transaction(function () use ($shift, $formattedMeters, $formattedDips, $paymentsToUse, $data) {
            $originalStatus = $shift->status;
            $originalLockedAt = $shift->locked_at;

            $shift->meterReadings()->delete();
            $shift->dipReadings()->delete();

            $service = app(ShiftReconciliationService::class);
            // Flagged as an approved correction: it is allowed to restate an
            // opening reading that no longer matches the nozzle, which is the
            // whole point of the edit-request workflow.
            $service->reconcile($shift, $formattedMeters, $formattedDips, $paymentsToUse, true);

            $shift->refresh();

            // Apply any direct column updates for Shift that might be in the data
            $columns = Schema::getColumnListing($shift->getTable());
            $updateData = array_intersect_key($data, array_flip($columns));

            $shift->update(array_merge($updateData, [
                'status' => $originalStatus,
                'locked_at' => $originalLockedAt,
            ]));
        });
    }

    protected function buildOriginalData(Model $model, array $requestedData): array
    {
        $original = [];
        // Robust check for Shift model to avoid potential namespace/proxy issues
        $isShift = $model instanceof Shift || get_class($model) === 'App\Models\Shift' || $model->getMorphClass() === 'App\Models\Shift';

        foreach ($requestedData as $key => $value) {
            if ($isShift && ($key === 'meters' || $key === 'readings')) {
                $original[$key] = $model->meterReadings()->get()->map(function ($m) {
                    return [
                        'id' => $m->id,
                        'nozzle_id' => $m->nozzle_id,
                        'opening_reading' => (float) $m->opening_reading,
                        'closing_reading' => (float) $m->closing_reading,
                        'volume_sold' => (float) $m->volume_sold,
                        'price_per_liter' => (float) $m->price_per_liter,
                        'total_value' => (float) $m->total_value,
                    ];
                })->values()->all();

                continue;
            }

            if ($isShift && $key === 'dips') {
                $original['dips'] = $model->dipReadings()->get()->map(function ($d) {
                    return [
                        'id' => $d->id,
                        'tank_id' => $d->tank_id,
                        'dip_mm' => (float) $d->dip_mm,
                        'volume_liters' => (float) $d->volume_liters,
                    ];
                })->values()->all();

                continue;
            }

            $original[$key] = $model->{$key} ?? null;
        }

        return $original;
    }
}
