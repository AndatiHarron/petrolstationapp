<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\FiltersByStation;
use App\Http\Controllers\Controller;
use App\Http\Requests\RejectCreditSettlementRequest;
use App\Http\Requests\StoreCreditSettlementRequest;
use App\Http\Resources\CreditSettlementResource;
use App\Models\CreditSettlement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * Clearing a customer's credit balance: recorded by a manager, approved by an
 * admin. See CreditSettlement for why the balance only moves on approval.
 */
class CreditSettlementController extends Controller
{
    use FiltersByStation;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', CreditSettlement::class);

        $user = Auth::user();

        $settlements = CreditSettlement::query()
            ->with(['customer:id,name,current_balance', 'station:id,name', 'recordedBy:id,name', 'approvedBy:id,name'])
            ->when(
                $request->filled('status'),
                fn (Builder $query) => $query->where('status', strtoupper((string) $request->input('status')))
            )
            ->when(
                $request->filled('customer_id'),
                fn (Builder $query) => $query->where('customer_id', $request->input('customer_id'))
            )
            // An administrator narrowing the company view to one station.
            ->when(
                $this->requestedStationId($request),
                fn (Builder $query, string $stationId) => $query->where('station_id', $stationId)
            )
            // A manager sees their station's settlements, not the whole company's.
            ->when(
                $user->hasRole('manager') && $user->station_id,
                fn (Builder $query) => $query->where(fn (Builder $q) => $q
                    ->where('station_id', $user->station_id)
                    ->orWhere('recorded_by_user_id', $user->getKey()))
            )
            ->latest()
            ->paginate();

        return CreditSettlementResource::collection($settlements);
    }

    public function store(StoreCreditSettlementRequest $request)
    {
        Gate::authorize('create', CreditSettlement::class);

        $user = Auth::user();

        $settlement = CreditSettlement::create([
            'organization_id' => $user->organization_id,
            'customer_id' => $request->validated('customer_id'),
            'station_id' => $user->station_id,
            'amount' => $request->validated('amount'),
            'method' => $request->validated('method'),
            'reference' => $request->validated('reference'),
            'notes' => $request->validated('notes'),
            'recorded_by_user_id' => $user->getKey(),
            'status' => CreditSettlement::STATUS_PENDING,
        ]);

        $settlement->load(['customer:id,name,current_balance', 'station:id,name', 'recordedBy:id,name']);

        return (new CreditSettlementResource($settlement))
            ->response()
            ->setStatusCode(201);
    }

    public function show(CreditSettlement $creditSettlement)
    {
        Gate::authorize('view', $creditSettlement);

        $creditSettlement->load(['customer:id,name,current_balance', 'station:id,name', 'recordedBy:id,name', 'approvedBy:id,name']);

        return new CreditSettlementResource($creditSettlement);
    }

    public function approve(CreditSettlement $creditSettlement)
    {
        Gate::authorize('approve', $creditSettlement);

        $approved = $creditSettlement->approve(Auth::user());
        $approved->load(['customer:id,name,current_balance', 'station:id,name', 'recordedBy:id,name', 'approvedBy:id,name']);

        return new CreditSettlementResource($approved);
    }

    public function reject(RejectCreditSettlementRequest $request, CreditSettlement $creditSettlement)
    {
        Gate::authorize('approve', $creditSettlement);

        $rejected = $creditSettlement->reject(Auth::user(), $request->validated('reason'));
        $rejected->load(['customer:id,name,current_balance', 'station:id,name', 'recordedBy:id,name', 'approvedBy:id,name']);

        return new CreditSettlementResource($rejected);
    }
}
