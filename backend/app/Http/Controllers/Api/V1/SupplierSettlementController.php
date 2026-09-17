<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\FiltersByStation;
use App\Http\Controllers\Controller;
use App\Http\Requests\RejectCreditSettlementRequest;
use App\Http\Requests\StoreSupplierSettlementRequest;
use App\Http\Resources\SupplierSettlementResource;
use App\Models\SupplierSettlement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * Paying suppliers down: recorded by whoever pays, approved by an admin.
 * The supplier balance moves only on approval.
 */
class SupplierSettlementController extends Controller
{
    use FiltersByStation;

    /** @var list<string> */
    private const RELATIONS = [
        'supplier:id,name,current_balance',
        'station:id,name',
        'recordedBy:id,name',
        'approvedBy:id,name',
    ];

    public function index(Request $request)
    {
        Gate::authorize('viewAny', SupplierSettlement::class);

        $user = Auth::user();

        $settlements = SupplierSettlement::query()
            ->with(self::RELATIONS)
            ->when(
                $request->filled('status'),
                fn (Builder $query) => $query->where('status', strtoupper((string) $request->input('status')))
            )
            ->when(
                $request->filled('supplier_id'),
                fn (Builder $query) => $query->where('supplier_id', $request->input('supplier_id'))
            )
            // An administrator narrowing the company view to one station.
            ->when(
                $this->requestedStationId($request),
                fn (Builder $query, string $stationId) => $query->where('station_id', $stationId)
            )
            // A manager sees their own station, not the whole company.
            ->when(
                $user->hasRole('manager') && $user->station_id,
                fn (Builder $query) => $query->where(fn (Builder $q) => $q
                    ->where('station_id', $user->station_id)
                    ->orWhere('recorded_by_user_id', $user->getKey()))
            )
            ->latest()
            ->paginate();

        return SupplierSettlementResource::collection($settlements);
    }

    public function store(StoreSupplierSettlementRequest $request)
    {
        Gate::authorize('create', SupplierSettlement::class);

        $user = Auth::user();

        $settlement = SupplierSettlement::create([
            'organization_id' => $user->organization_id,
            'supplier_id' => $request->validated('supplier_id'),
            'station_id' => $user->station_id,
            'amount' => $request->validated('amount'),
            'method' => $request->validated('method'),
            'reference' => $request->validated('reference'),
            'notes' => $request->validated('notes'),
            'recorded_by_user_id' => $user->getKey(),
            'status' => SupplierSettlement::STATUS_PENDING,
        ]);

        $settlement->load(self::RELATIONS);

        return (new SupplierSettlementResource($settlement))->response()->setStatusCode(201);
    }

    public function show(SupplierSettlement $supplierSettlement)
    {
        Gate::authorize('view', $supplierSettlement);

        $supplierSettlement->load(self::RELATIONS);

        return new SupplierSettlementResource($supplierSettlement);
    }

    public function approve(SupplierSettlement $supplierSettlement)
    {
        Gate::authorize('approve', $supplierSettlement);

        $approved = $supplierSettlement->approve(Auth::user());
        $approved->load(self::RELATIONS);

        return new SupplierSettlementResource($approved);
    }

    public function reject(RejectCreditSettlementRequest $request, SupplierSettlement $supplierSettlement)
    {
        Gate::authorize('approve', $supplierSettlement);

        $rejected = $supplierSettlement->reject(Auth::user(), $request->validated('reason'));
        $rejected->load(self::RELATIONS);

        return new SupplierSettlementResource($rejected);
    }
}
