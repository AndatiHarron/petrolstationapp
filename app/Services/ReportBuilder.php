<?php

namespace App\Services;

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Lifting;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Assembles the composite reports — end of day, monthly, credit, user and VAT.
 *
 * These all rest on the same three facts about a shift (what the meters said,
 * what was collected, what the tank held), so the query shaping lives here once
 * rather than being repeated per endpoint.
 */
class ReportBuilder
{
    public function __construct(protected string $organizationId) {}

    /**
     * Every shift that overlaps a window, optionally narrowed to one station or
     * the user who opened it.
     */
    protected function shifts(Carbon $start, Carbon $end, ?string $stationId = null, ?string $userId = null): Builder
    {
        return Shift::query()
            ->where('organization_id', $this->organizationId)
            ->whereBetween('started_at', [$start, $end])
            ->when($stationId, fn (Builder $q, string $id) => $q->where('station_id', $id))
            ->when($userId, fn (Builder $q, string $id) => $q->where('started_by_user_id', $id));
    }

    protected function liftings(Carbon $start, Carbon $end, ?string $stationId = null): Builder
    {
        return Lifting::query()
            ->where('organization_id', $this->organizationId)
            ->whereBetween('lifting_date', [$start->toDateString(), $end->toDateString()])
            ->when($stationId, fn (Builder $q, string $id) => $q->where('station_id', $id));
    }

    /**
     * The shift totals every composite report leads with.
     *
     * @return array<string, float|int>
     */
    protected function shiftTotals(Builder $shifts): array
    {
        $row = $shifts->clone()
            ->selectRaw('COUNT(*) as shift_count')
            ->selectRaw('COALESCE(SUM(total_stock_sold_liters), 0) as liters_sold')
            ->selectRaw('COALESCE(SUM(total_expected_cash), 0) as expected_cash')
            ->selectRaw('COALESCE(SUM(total_collected_cash), 0) as collected_cash')
            ->selectRaw('COALESCE(SUM(cash_variance), 0) as cash_variance')
            ->selectRaw('COALESCE(SUM(stock_variance_liters), 0) as stock_variance_liters')
            ->selectRaw('COALESCE(SUM(total_tax_collected), 0) as tax_collected')
            ->first();

        return [
            'shift_count' => (int) $row->shift_count,
            'liters_sold' => round((float) $row->liters_sold, 2),
            'expected_cash' => round((float) $row->expected_cash, 2),
            'collected_cash' => round((float) $row->collected_cash, 2),
            'cash_variance' => round((float) $row->cash_variance, 2),
            'stock_variance_liters' => round((float) $row->stock_variance_liters, 2),
            'tax_collected' => round((float) $row->tax_collected, 2),
        ];
    }

    /**
     * Money collected, split by how it arrived.
     *
     * @return array<string, float>
     */
    protected function paymentsByMethod(Builder $shifts): array
    {
        $rows = Payment::query()
            ->whereIn('shift_id', $shifts->clone()->select('id'))
            ->selectRaw('method, COALESCE(SUM(amount), 0) as total')
            ->groupBy('method')
            ->pluck('total', 'method');

        return [
            'cash' => round((float) ($rows['cash'] ?? 0), 2),
            'mpesa' => round((float) ($rows['mpesa'] ?? 0), 2),
            'credit' => round((float) ($rows['credit'] ?? 0), 2),
        ];
    }

    // ─── End of day ───────────────────────────────────────────────

    /**
     * One calendar day, every shift on it combined.
     *
     * @return array<string, mixed>
     */
    public function endOfDay(Carbon $day, ?string $stationId = null): array
    {
        $start = $day->copy()->startOfDay();
        $end = $day->copy()->endOfDay();

        $shifts = $this->shifts($start, $end, $stationId);

        $breakdown = $shifts->clone()
            ->with(['station:id,name', 'startedBy:id,name'])
            ->orderBy('started_at')
            ->get()
            ->map(fn (Shift $shift) => [
                'shift_number' => $shift->shift_number,
                'station_name' => $shift->station?->name,
                'attendant' => $shift->startedBy?->name,
                'started_at' => $shift->started_at?->format('H:i'),
                'locked_at' => $shift->locked_at?->format('H:i'),
                'status' => $shift->status,
                'liters_sold' => round((float) $shift->total_stock_sold_liters, 2),
                'expected_cash' => round((float) $shift->total_expected_cash, 2),
                'collected_cash' => round((float) $shift->total_collected_cash, 2),
                'cash_variance' => round((float) $shift->cash_variance, 2),
                'stock_variance_liters' => round((float) $shift->stock_variance_liters, 2),
            ]);

        $creditSales = CreditSale::query()
            ->whereIn('shift_id', $shifts->clone()->select('id'))
            ->with('customer:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn (CreditSale $sale) => [
                'customer_name' => $sale->customer?->name,
                'vehicle_reg' => $sale->vehicle_reg,
                'amount' => round((float) $sale->amount, 2),
            ]);

        return [
            'date' => $day->toDateString(),
            'station' => $this->stationLabel($stationId),
            'totals' => $this->shiftTotals($shifts),
            'payments' => $this->paymentsByMethod($shifts),
            'shifts' => $breakdown,
            'credit_sales' => $creditSales,
            'credit_total' => round((float) $creditSales->sum('amount'), 2),
        ];
    }

    // ─── Monthly ──────────────────────────────────────────────────

    /**
     * A whole month, with the day-by-day series underneath the totals.
     *
     * @return array<string, mixed>
     */
    public function monthly(Carbon $month, ?string $stationId = null): array
    {
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        $shifts = $this->shifts($start, $end, $stationId);
        $liftings = $this->liftings($start, $end, $stationId);

        $daily = $shifts->clone()
            ->selectRaw('DATE(started_at) as date')
            ->selectRaw('COUNT(*) as shift_count')
            ->selectRaw('COALESCE(SUM(total_stock_sold_liters), 0) as liters_sold')
            ->selectRaw('COALESCE(SUM(total_expected_cash), 0) as expected_cash')
            ->selectRaw('COALESCE(SUM(total_collected_cash), 0) as collected_cash')
            ->selectRaw('COALESCE(SUM(cash_variance), 0) as cash_variance')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'shift_count' => (int) $row->shift_count,
                'liters_sold' => round((float) $row->liters_sold, 2),
                'expected_cash' => round((float) $row->expected_cash, 2),
                'collected_cash' => round((float) $row->collected_cash, 2),
                'cash_variance' => round((float) $row->cash_variance, 2),
            ]);

        $totals = $this->shiftTotals($shifts);
        $purchaseCost = round((float) $liftings->clone()->sum('total_cost'), 2);
        $taxPaid = round((float) $liftings->clone()->sum('tax_paid'), 2);

        return [
            'month' => $start->format('F Y'),
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'station' => $this->stationLabel($stationId),
            'totals' => $totals,
            'payments' => $this->paymentsByMethod($shifts),
            'purchases' => [
                'lifting_count' => $liftings->clone()->count(),
                'liters_received' => round((float) $liftings->clone()->sum('volume_liters'), 2),
                'total_cost' => $purchaseCost,
                'tax_paid' => $taxPaid,
            ],
            'gross_margin' => round($totals['expected_cash'] - $purchaseCost, 2),
            'net_vat' => round($totals['tax_collected'] - $taxPaid, 2),
            'daily' => $daily,
            'days_traded' => $daily->count(),
        ];
    }

    // ─── Credit ───────────────────────────────────────────────────

    /**
     * Credit extended over a window, per customer, with utilisation against
     * each customer's limit.
     *
     * @return array<string, mixed>
     */
    public function credit(Carbon $start, Carbon $end, ?string $stationId = null, ?string $customerId = null): array
    {
        $customers = Customer::query()
            ->where('organization_id', $this->organizationId)
            ->when($customerId, fn (Builder $q, string $id) => $q->whereKey($id))
            ->orderBy('name')
            ->get();

        $rows = $customers->map(function (Customer $customer) use ($start, $end, $stationId): array {
            $sales = CreditSale::query()
                ->where('customer_id', $customer->id)
                ->when(
                    $stationId,
                    fn (Builder $q, string $id) => $q->whereHas(
                        'shift',
                        fn (Builder $shift) => $shift->where('station_id', $id)
                    )
                );

            $periodCharges = round((float) $sales->clone()->whereBetween('created_at', [$start, $end])->sum('amount'), 2);
            $saleCount = $sales->clone()->whereBetween('created_at', [$start, $end])->count();
            $opening = round((float) $sales->clone()->where('created_at', '<', $start)->sum('amount'), 2);

            $invoiced = round((float) Invoice::query()
                ->where('customer_id', $customer->id)
                ->whereBetween('created_at', [$start, $end])
                ->sum('total_amount'), 2);

            $limit = (float) $customer->credit_limit;
            $balance = (float) $customer->current_balance;

            return [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'phone' => $customer->phone,
                'credit_limit' => round($limit, 2),
                'current_balance' => round($balance, 2),
                'available_credit' => round(max($limit - $balance, 0), 2),
                'utilisation_pct' => $limit > 0 ? round(($balance / $limit) * 100, 1) : null,
                'over_limit' => $limit > 0 && $balance > $limit,
                'opening_balance' => $opening,
                'period_charges' => $periodCharges,
                'period_sale_count' => $saleCount,
                'invoiced' => $invoiced,
            ];
        })
            // Customers with no activity and nothing owing are noise on a credit report.
            ->filter(fn (array $row) => $row['period_charges'] > 0 || $row['current_balance'] > 0)
            ->values();

        return [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'station' => $this->stationLabel($stationId),
            'customers' => $rows,
            'totals' => [
                'customer_count' => $rows->count(),
                'period_charges' => round((float) $rows->sum('period_charges'), 2),
                'outstanding' => round((float) $rows->sum('current_balance'), 2),
                'invoiced' => round((float) $rows->sum('invoiced'), 2),
                'over_limit_count' => $rows->where('over_limit', true)->count(),
            ],
        ];
    }

    // ─── Users ────────────────────────────────────────────────────

    /**
     * Per-attendant performance. The point of this report is the variance
     * column: it is how a pattern attaches to a person rather than a shift.
     *
     * @return array<string, mixed>
     */
    public function users(Carbon $start, Carbon $end, ?string $stationId = null, ?string $userId = null): array
    {
        $rows = $this->shifts($start, $end, $stationId, $userId)
            ->selectRaw('started_by_user_id')
            ->selectRaw('COUNT(*) as shift_count')
            ->selectRaw('COALESCE(SUM(total_stock_sold_liters), 0) as liters_sold')
            ->selectRaw('COALESCE(SUM(total_expected_cash), 0) as expected_cash')
            ->selectRaw('COALESCE(SUM(total_collected_cash), 0) as collected_cash')
            ->selectRaw('COALESCE(SUM(cash_variance), 0) as cash_variance')
            ->selectRaw('COALESCE(SUM(stock_variance_liters), 0) as stock_variance_liters')
            ->groupBy('started_by_user_id')
            ->get();

        $names = User::query()
            ->whereIn('id', $rows->pluck('started_by_user_id')->filter())
            ->pluck('name', 'id');

        $report = $rows->map(function ($row) use ($names): array {
            $shiftCount = (int) $row->shift_count;
            $variance = round((float) $row->cash_variance, 2);

            return [
                'user_id' => $row->started_by_user_id,
                'user_name' => $names[$row->started_by_user_id] ?? 'Unknown user',
                'shift_count' => $shiftCount,
                'liters_sold' => round((float) $row->liters_sold, 2),
                'expected_cash' => round((float) $row->expected_cash, 2),
                'collected_cash' => round((float) $row->collected_cash, 2),
                'cash_variance' => $variance,
                'stock_variance_liters' => round((float) $row->stock_variance_liters, 2),
                'avg_variance_per_shift' => $shiftCount > 0 ? round($variance / $shiftCount, 2) : 0.0,
            ];
        })
            // Worst variance first: that is the row anyone opens this report for.
            ->sortBy('cash_variance')
            ->values();

        return [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'station' => $this->stationLabel($stationId),
            'users' => $report,
            'totals' => [
                'user_count' => $report->count(),
                'shift_count' => (int) $report->sum('shift_count'),
                'cash_variance' => round((float) $report->sum('cash_variance'), 2),
            ],
        ];
    }

    // ─── VAT ──────────────────────────────────────────────────────

    /**
     * Output tax against input tax, with the monthly series a filing is built
     * from.
     *
     * @return array<string, mixed>
     */
    public function vat(Carbon $start, Carbon $end, ?string $stationId = null): array
    {
        $shifts = $this->shifts($start, $end, $stationId);
        $liftings = $this->liftings($start, $end, $stationId);

        $collected = round((float) $shifts->clone()->sum('total_tax_collected'), 2);
        $paid = round((float) $liftings->clone()->sum('tax_paid'), 2);

        // Grouped in PHP rather than with a date function in SQL: strftime is
        // SQLite-only and DATE_FORMAT is MySQL-only, and this runs on Postgres in
        // production. The row count here is one per day, so the cost is nil.
        $collectedByMonth = $shifts->clone()
            ->selectRaw('DATE(started_at) as day')
            ->selectRaw('COALESCE(SUM(total_tax_collected), 0) as total')
            ->groupBy('day')
            ->get()
            ->groupBy(fn ($row) => substr((string) $row->day, 0, 7))
            ->map(fn ($group) => (float) $group->sum('total'));

        $paidByMonth = $liftings->clone()
            ->selectRaw('lifting_date as day')
            ->selectRaw('COALESCE(SUM(tax_paid), 0) as total')
            ->groupBy('day')
            ->get()
            ->groupBy(fn ($row) => substr((string) $row->day, 0, 7))
            ->map(fn ($group) => (float) $group->sum('total'));

        $periods = $collectedByMonth->keys()
            ->merge($paidByMonth->keys())
            ->unique()
            ->sort()
            ->values()
            ->map(fn (string $period) => [
                'period' => $period,
                'label' => Carbon::createFromFormat('Y-m', $period)->format('M Y'),
                'tax_collected' => round((float) ($collectedByMonth[$period] ?? 0), 2),
                'tax_paid' => round((float) ($paidByMonth[$period] ?? 0), 2),
                'net_tax' => round((float) ($collectedByMonth[$period] ?? 0) - (float) ($paidByMonth[$period] ?? 0), 2),
            ]);

        return [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'station' => $this->stationLabel($stationId),
            'totals' => [
                'tax_collected' => $collected,
                'tax_paid' => $paid,
                'net_tax' => round($collected - $paid, 2),
                'payable' => $collected - $paid > 0,
                'taxable_sales' => round((float) $shifts->clone()->sum('total_expected_cash'), 2),
                'taxable_purchases' => round((float) $liftings->clone()->sum('total_cost'), 2),
            ],
            'periods' => $periods,
        ];
    }

    // ─── Shared ───────────────────────────────────────────────────

    /**
     * A station name for the report header, or "All stations".
     */
    protected function stationLabel(?string $stationId): string
    {
        if ($stationId === null) {
            return 'All stations';
        }

        return Station::query()->whereKey($stationId)->value('name') ?? 'Unknown station';
    }

    /**
     * @return Collection<int, Station>
     */
    public function stations(): Collection
    {
        return Station::query()
            ->where('organization_id', $this->organizationId)
            ->orderBy('name')
            ->get();
    }
}
