<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Illuminate\Support\Facades\Gate;

class CreditorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        Gate::authorize('viewAny', Supplier::class);

        $suppliers = Supplier::latest()->paginate(20);

        return SupplierResource::collection($suppliers);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSupplierRequest $request)
    {
        Gate::authorize('create', Supplier::class);

        $supplier = Supplier::create($request->validated());

        return (new SupplierResource($supplier))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Supplier $creditor)
    {
        Gate::authorize('view', $creditor);

        return new SupplierResource($creditor->load(['liftings' => function ($query) {
            $query->latest('lifting_date')->limit(10);
        }]));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSupplierRequest $request, Supplier $creditor)
    {
        Gate::authorize('update', $creditor);

        $creditor->update($request->validated());

        return new SupplierResource($creditor);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Supplier $creditor)
    {
        Gate::authorize('delete', $creditor);

        $creditor->delete();

        return response()->noContent();
    }
}
