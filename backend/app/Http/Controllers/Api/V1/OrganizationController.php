<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
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
}
