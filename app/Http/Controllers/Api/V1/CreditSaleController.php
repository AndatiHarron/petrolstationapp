<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCreditSaleRequest;
use App\Http\Resources\CreditSaleResource;
use App\Models\CreditSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CreditSaleController extends Controller
{
    /**
     * Display a paginated list of credit sales.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', CreditSale::class);

        $user = $request->user();
        $query = CreditSale::with(['customer'])->latest();

        if ($user->hasRole('manager') && $user->station_id) {
            $query->whereHas('shift', function ($q) use ($user) {
                $q->where('station_id', $user->station_id);
            });
        }

        return CreditSaleResource::collection($query->paginate(20));
    }

    /**
     * Store a newly created credit sale.
     */
    public function store(StoreCreditSaleRequest $request)
    {
        Gate::authorize('create', CreditSale::class);

        $data = $request->validated();

        if ($request->user()->hasRole('super-admin')) {
            $shift = \App\Models\Shift::withoutGlobalScopes()->find($data['shift_id']);
            $data['organization_id'] = $shift->organization_id;
        }

        $sale = CreditSale::create($data);

        return (new CreditSaleResource($sale->load(['customer'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified credit sale.
     */
    public function show(CreditSale $creditSale)
    {
        Gate::authorize('view', $creditSale);

        return new CreditSaleResource($creditSale->load(['customer']));
    }
}
