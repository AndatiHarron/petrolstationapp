<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLiftingRequest;
use App\Http\Resources\LiftingResource;
use App\Models\Lifting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class LiftingController extends Controller
{
    /**
     * List Liftings
     * Filterable by date range and station (for Admins)
     */
    public function index(Request $request)
    {
        $query = Lifting::with(['station', 'tank.product'])->latest('lifting_date');

        // Filter: Date Range
        if ($request->has(['from', 'to'])) {
            $query->whereBetween('lifting_date', [$request->from, $request->to]);
        }

        // Filter: Station (Admins only, Managers handled by scope/policy)
        if ($request->has('station_id')) {
            $query->where('station_id', $request->station_id);
        }

        return LiftingResource::collection($query->paginate(20));
    }

    /**
     * Store a new Lifting
     */
    public function store(StoreLiftingRequest $request)
    {
        Gate::authorize('create', Lifting::class);

        $lifting = Lifting::create($request->validated());

        return new LiftingResource($lifting->load(['station', 'tank.product']));
    }

    /**
     * Show a specific lifting
     */
    public function show(Lifting $lifting)
    {
        Gate::authorize('view', $lifting);

        return new LiftingResource($lifting->load(['station', 'tank.product']));
    }

    /**
     * Delete a lifting
     * (Reverses the inventory effect automatically via model 'deleted' event)
     */
    public function destroy(Lifting $lifting)
    {
        Gate::authorize('delete', $lifting);

        $lifting->delete();

        return response()->json(['message' => 'Lifting deleted and inventory reversed successfully.']);
    }
}
