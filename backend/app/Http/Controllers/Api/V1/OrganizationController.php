<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrganizationController extends Controller
{
    /**
     * List all organizations.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Organization::class);

        $organizations = Organization::latest()->paginate(20);

        return OrganizationResource::collection($organizations);
    }

    /**
     * Store a newly created organization in storage.
     */
    public function store(StoreOrganizationRequest $request)
    {
        Gate::authorize('create', Organization::class);

        $organization = Organization::create($request->validated());

        return new OrganizationResource($organization);
    }

    /**
     * Display the specified organization.
     */
    public function show(Organization $organization)
    {
        Gate::authorize('view', $organization);

        return new OrganizationResource($organization);
    }

    /**
     * Rename a tenant, or switch it on and off.
     */
    public function update(UpdateOrganizationRequest $request, Organization $organization)
    {
        Gate::authorize('update', $organization);

        $organization->update($request->validated());

        return new OrganizationResource($organization);
    }

    /**
     * Delete a tenant, but only one that holds nothing.
     *
     * An organization is the root of everything a station records, and the
     * rows beneath it carry no cascade — deleting a populated tenant would
     * orphan its shifts, sales and evidence rather than remove them. Switching
     * the tenant to inactive is the reversible way to take it out of service,
     * so that is what the caller is pointed at.
     */
    public function destroy(Organization $organization)
    {
        Gate::authorize('delete', $organization);

        $counts = [
            'users' => $organization->users()->count(),
            'stations' => $organization->stations()->count(),
            'shifts' => $organization->shifts()->count(),
        ];

        $holding = array_filter($counts);

        if ($holding !== []) {
            $summary = collect($holding)
                ->map(fn (int $count, string $kind) => "{$count} {$kind}")
                ->join(', ', ' and ');

            return response()->json([
                'message' => "This organization still has {$summary}. Set it to inactive instead, or remove those first.",
            ], 422);
        }

        $organization->delete();

        return response()->noContent();
    }
}
