<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class CustomerController extends Controller
{
    /**
     * List Customers
     * Supports ?search=John for finding customers during a sale.
     */
    public function index(Request $request)
    {
        $query = Customer::query()->with('latestCreditSale');

        if ($request->boolean('has_debt')) {
            $query->where('current_balance', '>', 0)
                ->orderByDesc('current_balance');
        } else {
            $query->latest();
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('tax_pin', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return CustomerResource::collection($query->paginate(20));
    }

    /**
     * Store a new Customer
     */
    public function store(StoreCustomerRequest $request)
    {
        Gate::authorize('create', Customer::class);

        $customer = Customer::create($request->validated());

        return new CustomerResource($customer->load('latestCreditSale'));
    }

    /**
     * Show a specific customer
     */
    public function show(Customer $customer)
    {
        Gate::authorize('view', $customer);

        return new CustomerResource($customer->load('latestCreditSale'));
    }

    /**
     * Update Customer details
     */
    public function update(UpdateCustomerRequest $request, Customer $customer)
    {
        Gate::authorize('update', $customer);

        //        if ($request->has('credit_limit') && !Auth::user()->hasRole('admin')) {
        //            return response()->json([
        //                'message' => 'Only Admins can change credit limits.'
        //            ]);
        //        }

        $customer->update($request->validated());

        return new CustomerResource($customer->load('latestCreditSale'));
    }

    /**
     * Delete a customer
     */
    public function destroy(Customer $customer)
    {
        Gate::authorize('delete', $customer);

        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully']);
    }
}
