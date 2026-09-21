<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Lifting;
use App\Models\Shift;
use App\Services\DebtService;
use App\Services\LedgerService;
use App\Services\ReportBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Debt Aging Report
     *
     * Outstanding customer credit, bucketed by how long it has been owed.
     */
    public function debtAging(ReportFilterRequest $request, DebtService $debtService)
    {
        $asOf = $request->endDate();

        $customers = Customer::query()
            ->where('current_balance', '>', 0)
            ->when($request->customerId(), fn (Builder $query, string $id) => $query->whereKey($id))
            ->orderBy('name')
            ->get();

        // Each invoice is aged by its own date and by how much of it is still
        // unpaid, which the settlement allocations record directly. The report
        // used to infer this from the balance alone, walking sales newest-first
        // — so a customer who pays steadily had genuinely old debt reported as
        // fresh, which is the one thing an aging report must not do.
        $report = $customers->map(function (Customer $customer) use ($request, $asOf, $debtService): array {
            $aging = $debtService->agingFor($customer, $asOf, $request->stationId());

            return [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'total_debt' => $aging['total'],
                'balance_on_account' => (float) $customer->current_balance,
                'credit_limit' => (float) $customer->credit_limit,
                'oldest_days' => $aging['oldest_days'],
                'buckets' => $aging['buckets'],
                // Owed, but not traceable to an open invoice — a brought-forward
                // opening balance, or a discrepancy worth someone looking at.
                'unallocated' => $aging['unallocated'],
                'invoices' => $aging['invoices'],
            ];
        })
            ->filter(fn (array $row): bool => $row['total_debt'] > 0)
            ->values();

        return response()->json([
            'data' => $report,
            'meta' => $this->filterMeta($request) + [
                'as_of' => $asOf->toDateString(),
                'total_outstanding' => round($report->sum('total_debt'), 2),
            ],
        ]);
    }

    /**
     * Profit & Loss Report
     */
    public function pl(ReportFilterRequest $request, LedgerService $ledger)
    {
        $start = $request->startDate();
        $end = $request->endDate();
        $stationId = $request->stationId();

        // Shifts are dated by when they were worked, and liftings by the delivery
        // date, rather than by row creation time — a shift entered late would
        // otherwise land in the wrong reporting period.
        $shifts = Shift::query()
            ->whereBetween('started_at', [$start, $end])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id));

        $liftings = Lifting::query()
            ->whereBetween('lifting_date', [$start->toDateString(), $end->toDateString()])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id));

        $sales = (float) $shifts->clone()->sum('total_expected_cash');
        $purchases = (float) $liftings->clone()->sum('total_cost');
        $taxes = (float) $shifts->clone()->sum('total_tax_collected');

        // Cost of sales comes from the ledger, where it is the moving-average
        // cost of the litres actually sold. Counting deliveries instead only
        // reads right for a period that opens and closes at the same tank level,
        // which no real month does — a month that ran the tanks down looked
        // wildly profitable and the month that refilled them looked like a loss.
        $balances = collect($ledger->trialBalance(
            Auth::user()->organization_id,
            $start,
            $end,
            $stationId,
        )['accounts'])->keyBy('code');

        $costOfSales = (float) ($balances['COGS']['balance'] ?? 0);
        $stockVariance = (float) ($balances['STOCK_VARIANCE']['balance'] ?? 0);
        $cashVariance = (float) ($balances['CASH_VARIANCE']['balance'] ?? 0);

        // Until a tank has had a costed delivery there is no average to work
        // from, so fall back to the old basis rather than reporting no cost
        // at all and overstating the profit.
        $costsAreLedgerBacked = $costOfSales > 0;
        $costs = $costsAreLedgerBacked ? $costOfSales : $purchases;

        $netSales = round($sales - $taxes, 2);
        $grossProfit = round($netSales - $costs, 2);

        return response()->json([
            'data' => [
                'sales' => round($sales, 2),
                'net_sales' => $netSales,
                'costs' => round($costs, 2),
                'cost_of_sales' => round($costOfSales, 2),
                'purchases' => round($purchases, 2),
                'taxes' => round($taxes, 2),
                'gross_profit' => $grossProfit,
                'stock_variance_value' => round($stockVariance, 2),
                'cash_variance_value' => round($cashVariance, 2),
                // Annex A's formula, kept exactly: sales less cost of sales
                // less the tax liability.
                'net_profit' => round($sales - $costs - $taxes, 2),
                'operating_profit' => round($grossProfit - $stockVariance - $cashVariance, 2),
                'basis' => $costsAreLedgerBacked ? 'ledger' : 'purchases',
                'shift_count' => $shifts->clone()->count(),
                'lifting_count' => $liftings->clone()->count(),
            ],
            'meta' => $this->filterMeta($request),
        ]);
    }

    /**
     * Tax Summary Report
     *
     * VAT collected on sales against VAT paid on deliveries.
     */
    public function taxSummary(ReportFilterRequest $request)
    {
        $start = $request->startDate();
        $end = $request->endDate();
        $stationId = $request->stationId();

        $collected = (float) Shift::query()
            ->whereBetween('started_at', [$start, $end])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id))
            ->sum('total_tax_collected');

        $paid = (float) Lifting::query()
            ->whereBetween('lifting_date', [$start->toDateString(), $end->toDateString()])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id))
            ->sum('tax_paid');

        return response()->json([
            'data' => [
                'tax_collected' => round($collected, 2),
                'tax_paid' => round($paid, 2),
                'net_tax' => round($collected - $paid, 2),
            ],
            'meta' => $this->filterMeta($request),
        ]);
    }

    /**
     * Variance Trend Report
     *
     * Daily cash and stock variance, for spotting a station that is drifting.
     */
    public function varianceTrend(ReportFilterRequest $request)
    {
        // `days` stays supported; an explicit date range takes precedence.
        if ($request->filled('start_date') || $request->filled('end_date')) {
            $start = $request->startDate();
            $end = $request->endDate();
        } else {
            $days = (int) $request->input('days', 7);
            $start = now()->subDays($days)->startOfDay();
            $end = now()->endOfDay();
        }

        $variances = Shift::query()
            ->whereBetween('started_at', [$start, $end])
            ->when(
                $request->stationId(),
                fn (Builder $query, string $id) => $query->where('station_id', $id)
            )
            ->select(
                DB::raw('DATE(started_at) as date'),
                DB::raw('SUM(cash_variance) as total_variance'),
                DB::raw('SUM(stock_variance_liters) as total_stock_variance'),
                DB::raw('COUNT(*) as shift_count')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'total_variance' => (float) $row->total_variance,
                'total_stock_variance' => (float) $row->total_stock_variance,
                'shift_count' => (int) $row->shift_count,
            ]);

        return response()->json([
            'data' => $variances,
            'meta' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'station_id' => $request->stationId(),
            ],
        ]);
    }

    /**
     * Customer Statement
     *
     * Every credit sale and invoice for one customer over a period, with the
     * balance carried into the window. This is the document a credit customer
     * asks for when they query their bill.
     */
    public function customerStatement(ReportFilterRequest $request, Customer $customer)
    {
        $start = $request->startDate();
        $end = $request->endDate();
        $stationId = $request->stationId();

        $salesQuery = CreditSale::query()
            ->where('customer_id', $customer->id)
            ->when(
                $stationId,
                fn (Builder $query, string $id) => $query->whereHas(
                    'shift',
                    fn (Builder $shift) => $shift->where('station_id', $id)
                )
            );

        $openingBalance = (float) $salesQuery->clone()
            ->where('created_at', '<', $start)
            ->sum('amount');

        $lines = $salesQuery->clone()
            ->with(['shift:id,shift_number,station_id', 'shift.station:id,name'])
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at')
            ->get()
            ->map(fn (CreditSale $sale) => [
                'id' => $sale->id,
                'date' => $sale->created_at->toDateString(),
                'shift_number' => $sale->shift?->shift_number,
                'station_name' => $sale->shift?->station?->name,
                'vehicle_reg' => $sale->vehicle_reg,
                'amount' => (float) $sale->amount,
            ]);

        $invoices = Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at')
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'date' => $invoice->created_at->toDateString(),
                'total_amount' => (float) $invoice->total_amount,
            ]);

        $periodTotal = (float) $lines->sum('amount');

        return response()->json([
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'tax_pin' => $customer->tax_pin,
                    'credit_limit' => (float) $customer->credit_limit,
                    'current_balance' => (float) $customer->current_balance,
                ],
                'opening_balance' => round($openingBalance, 2),
                'period_charges' => round($periodTotal, 2),
                'closing_balance' => round($openingBalance + $periodTotal, 2),
                'lines' => $lines,
                'invoices' => $invoices,
            ],
            'meta' => $this->filterMeta($request) + [
                'line_count' => $lines->count(),
            ],
        ]);
    }

    // ─── Composite reports ────────────────────────────────────────

    /**
     * End of Day Report
     *
     * Every shift on one calendar day, combined. This is the document a station
     * closes the day against.
     */
    public function endOfDay(ReportFilterRequest $request)
    {
        $day = $request->day();
        $report = $this->builder()->endOfDay($day, $request->stationId());

        return $this->deliver($request, $report, 'end-of-day', 'End of Day Report', $day->format('D, j M Y'));
    }

    /**
     * Monthly Report
     */
    public function monthly(ReportFilterRequest $request)
    {
        $month = $request->startDate();
        $report = $this->builder()->monthly($month, $request->stationId());

        return $this->deliver($request, $report, 'monthly', 'Monthly Report', $report['month']);
    }

    /**
     * Credit Report
     */
    public function credit(ReportFilterRequest $request)
    {
        $report = $this->builder()->credit(
            $request->startDate(),
            $request->endDate(),
            $request->stationId(),
            $request->customerId()
        );

        return $this->deliver($request, $report, 'credit', 'Credit Report', $this->periodLabel($request));
    }

    /**
     * User Report
     *
     * Per-attendant performance, worst variance first.
     */
    public function users(ReportFilterRequest $request)
    {
        $report = $this->builder()->users(
            $request->startDate(),
            $request->endDate(),
            $request->stationId(),
            $request->userId()
        );

        return $this->deliver($request, $report, 'users', 'Attendant Report', $this->periodLabel($request));
    }

    /**
     * VAT Report
     */
    public function vat(ReportFilterRequest $request)
    {
        $report = $this->builder()->vat(
            $request->startDate(),
            $request->endDate(),
            $request->stationId()
        );

        return $this->deliver($request, $report, 'vat', 'VAT Report', $this->periodLabel($request));
    }

    // ─── Shared ───────────────────────────────────────────────────

    private function builder(): ReportBuilder
    {
        return new ReportBuilder();
    }

    private function periodLabel(ReportFilterRequest $request): string
    {
        return $request->startDate()->format('j M Y').' to '.$request->endDate()->format('j M Y');
    }

    /**
     * Return the report as JSON, or stream it as a PDF when format=pdf.
     *
     * @param  array<string, mixed>  $report
     */
    private function deliver(
        ReportFilterRequest $request,
        array $report,
        string $view,
        string $title,
        string $subtitle
    ): Response|\Illuminate\Http\JsonResponse {
        if (! $request->wantsPdf()) {
            return response()->json(['data' => $report]);
        }

        $user = Auth::user();

        $pdf = Pdf::loadView("reports.{$view}", [
            'report' => $report,
            'title' => $title,
            'subtitle' => $subtitle,
            'organization' => $user->organization?->name ?? 'Organization',
            'station' => $report['station'] ?? 'All stations',
            'generatedAt' => now()->format('j M Y, H:i'),
            'generatedBy' => $user->name,
        ])->setPaper('a4', in_array($view, ['end-of-day', 'users', 'credit'], true) ? 'landscape' : 'portrait');

        $filename = $title.' '.($report['date'] ?? $report['start_date'] ?? now()->toDateString()).'.pdf';

        return $pdf->download(str_replace(' ', '-', strtolower($filename)));
    }

    /**
     * Echo the filters back so a client can label the report it is showing.
     *
     * @return array<string, mixed>
     */
    private function filterMeta(ReportFilterRequest $request): array
    {
        return [
            'start_date' => $request->startDate()->toDateString(),
            'end_date' => $request->endDate()->toDateString(),
            'station_id' => $request->stationId(),
            'customer_id' => $request->customerId(),
        ];
    }
}
