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

        $data = $request->validated();

        // Only the platform owner may name an organization other than their
        // own; for anyone else the trait fills in theirs, and an attempt to
        // send one is ignored rather than honoured.
        if (! $request->user()->hasRole('super-admin')) {
            unset($data['organization_id']);
        }

        $station = Station::create($data);

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
