<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStationRequest;
use App\Http\Requests\UpdateStationRequest;
use App\Http\Resources\StationResource;
use App\Models\Station;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class StationController extends Controller
{
    /**
     * List all stations for the organization.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Station::class);

        $stations = Station::latest()->paginate(20);

        return StationResource::collection($stations);
    }

    /**
     * Create a new station.
     */
    public function store(StoreStationRequest $request)
    {
        Gate::authorize('create', Station::class);

        // organization_id is autofilled by the BelongsToOrganization trait
        $station = Station::create($request->validated());

        return new StationResource($station);
    }

    /**
     * Show a specific station.
     */
    public function show(Station $station)
    {
        Gate::authorize('view', $station);

        return new StationResource($station);
    }

    /**
     * Update station details.
     */
    public function update(UpdateStationRequest $request, Station $station)
    {
        Gate::authorize('update', $station);

        $station->update($request->validated());

        return new StationResource($station);
    }

    /**
     * Delete a station.
     */
    public function destroy(Station $station)
    {
        Gate::authorize('delete', $station);

        $station->delete();

        return response()->json(['message' => 'Station deleted successfully.']);
    }
}
