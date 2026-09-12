<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTankRequest;
use App\Http\Requests\UpdateTankRequest;
use App\Http\Resources\TankResource;
use App\Models\Tank;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TankController extends Controller
{
    /**
     * List Tanks
     * Filterable by Station ID
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Tank::class);

        // BelongsToOrganization trait handles the org scoping
        $query = Tank::with(['station', 'product'])->latest();

        if ($request->has('station_id')) {
            $query->where('station_id', $request->station_id);
        }

        return TankResource::collection($query->paginate(20));
    }

    /**
     * Store a new Tank
     */
    public function store(StoreTankRequest $request)
    {
        Gate::authorize('create', Tank::class);

        $data = $request->validated();

        if ($request->user()->hasRole('super-admin')) {
            $station = \App\Models\Station::withoutGlobalScopes()->find($data['station_id']);
            $data['organization_id'] = $station->organization_id;
        }

        $tank = Tank::create($data);

        // If initial volume is set, calculate the dip immediately
        if ($request->has('current_volume') || $request->has('calibration_chart')) {
            $tank->updateDipFromCurrentVolume();
            $tank->save();
        }

        return new TankResource($tank->load(['station', 'product']));
    }

    /**
     * Show a specific Tank
     */
    public function show(Tank $tank)
    {
        Gate::authorize('view', $tank);

        return new TankResource($tank->load(['station', 'product']));
    }

    /**
     * Update Tank details
     */
    public function update(UpdateTankRequest $request, Tank $tank)
    {
        Gate::authorize('update', $tank);

        $data = $request->validated();

        if ($request->user()->hasRole('super-admin') && isset($data['station_id'])) {
            $station = \App\Models\Station::withoutGlobalScopes()->find($data['station_id']);
            $data['organization_id'] = $station->organization_id;
        }

        $tank->update($data);

        // Recalculate dip if chart or volume changed
        if ($request->hasAny(['calibration_chart', 'current_volume'])) {
            $tank->updateDipFromCurrentVolume();
            $tank->save();
        }

        return new TankResource($tank->load(['station', 'product']));
    }

    /**
     * Delete a Tank
     */
    public function destroy(Tank $tank)
    {
        Gate::authorize('delete', $tank);

        $tank->delete();

        return response()->json(['message' => 'Tank deleted successfully.']);
    }
}
