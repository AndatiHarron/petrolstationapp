<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNozzleRequest;
use App\Http\Requests\UpdateNozzleRequest;
use App\Http\Resources\NozzleResource;
use App\Models\Nozzle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class NozzleController extends Controller
{
    /**
     * List Nozzles
     * Filterable by Station ID (for Manager/Admin views)
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Nozzle::class);

        $query = Nozzle::with(['station', 'tank.product'])->latest();

        if ($request->has('station_id')) {
            $query->where('station_id', $request->station_id);
        }

        return NozzleResource::collection($query->paginate(20));
    }

    /**
     * Create a new Nozzle
     */
    public function store(StoreNozzleRequest $request)
    {
        Gate::authorize('create', Nozzle::class);

        $data = $request->validated();

        if ($request->user()->hasRole('super-admin')) {
            $station = \App\Models\Station::withoutGlobalScopes()->find($data['station_id']);
            $data['organization_id'] = $station->organization_id;
        }

        $nozzle = Nozzle::create($data);

        return new NozzleResource($nozzle->load(['station', 'tank.product']));
    }

    /**
     * Show a specific Nozzle
     */
    public function show(Nozzle $nozzle)
    {
        Gate::authorize('view', $nozzle);

        return new NozzleResource($nozzle->load(['station', 'tank.product']));
    }

    /**
     * Update Nozzle details
     */
    public function update(UpdateNozzleRequest $request, Nozzle $nozzle)
    {
        Gate::authorize('update', $nozzle);

        $nozzle->update($request->validated());

        return new NozzleResource($nozzle->load(['station', 'tank.product']));
    }

    /**
     * Delete a Nozzle
     */
    public function destroy(Nozzle $nozzle)
    {
        Gate::authorize('delete', $nozzle);

        $nozzle->delete();

        return response()->json(['message' => 'Nozzle deleted successfully.']);
    }
}
