<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    /**
     * List all products in the organization
     */
    public function index()
    {
        Gate::authorize('viewAny', Product::class);

        // BelongsToOrganization trait automatically scopes this query
        $products = Product::latest()->paginate(20);

        return ProductResource::collection($products);
    }

    /**
     * Create a new product
     */
    public function store(StoreProductRequest $request)
    {
        Gate::authorize('create', Product::class);

        // Org ID is auto-assigned by Trait or Observer
        $product = Product::create($request->validated());

        return new ProductResource($product);
    }

    /**
     * Show a specific product
     */
    public function show(Product $product)
    {
        Gate::authorize('view', $product);

        return new ProductResource($product);
    }

    /**
     * Update a product (Price changes are logged by ActivityLog)
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        Gate::authorize('update', $product);

        $product->update($request->validated());

        return new ProductResource($product);
    }

    /**
     * Delete a product
     */
    public function destroy(Product $product)
    {
        Gate::authorize('delete', $product);

        // Optional: Check if tanks depend on this product before deleting
        if ($product->tanks()->exists()) {
            return response()->json([
                'message' => 'Cannot delete product associated with active tanks.',
                'errors' => ['id' => ['This product is in use by one or more tanks.']],
            ], 422);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully.']);
    }
}
