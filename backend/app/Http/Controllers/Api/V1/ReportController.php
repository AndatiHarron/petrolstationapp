<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Lifting;
use App\Models\Shift;
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
    public function debtAging(ReportFilterRequest $request)
    {
        $asOf = $request->endDate();

        $customers = Customer::query()
            ->where('organization_id', Auth::user()->organization_id)
            ->where('current_balance', '>', 0)
            ->when($request->customerId(), fn (Builder $query, string $id) => $query->whereKey($id))
            ->orderBy('name')
            ->get();

        $report = $customers->map(function (Customer $customer) use ($request, $asOf): array {
            $sales = CreditSale::query()
                ->where('customer_id', $customer->id)
                ->where('created_at', '<=', $asOf)
                ->when(
                    $request->stationId(),
                    fn (Builder $query, string $stationId) => $query->whereHas(
                        'shift',
                        fn (Builder $shift) => $shift->where('station_id', $stationId)
                    )
                )
                ->orderByDesc('created_at')
                ->get();

            $buckets = ['0-30' => 0.0, '31-60' => 0.0, '61-90' => 0.0, '90+' => 0.0];

            // The balance is consumed oldest-last: the most recent sales are
            // treated as the still-unpaid portion.
            $remainingBalance = (float) $customer->current_balance;

            foreach ($sales as $sale) {
                if ($remainingBalance <= 0) {
                    break;
                }

                $amountToCategorize = min($remainingBalance, (float) $sale->amount);
                $ageInDays = $sale->created_at->diffInDays($asOf);

                $bucket = match (true) {
                    $ageInDays <= 30 => '0-30',
                    $ageInDays <= 60 => '31-60',
                    $ageInDays <= 90 => '61-90',
                    default => '90+',
                };

                $buckets[$bucket] += $amountToCategorize;
                $remainingBalance -= $amountToCategorize;
            }

            return [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'total_debt' => (float) $customer->current_balance,
                'credit_limit' => (float) $customer->credit_limit,
                'buckets' => $buckets,
            ];
        })->values();

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
    public function pl(ReportFilterRequest $request)
    {
        $start = $request->startDate();
        $end = $request->endDate();
        $stationId = $request->stationId();

        // Shifts are dated by when they were worked, and liftings by the delivery
        // date, rather than by row creation time — a shift entered late would
        // otherwise land in the wrong reporting period.
        $shifts = Shift::query()
            ->where('organization_id', Auth::user()->organization_id)
            ->whereBetween('started_at', [$start, $end])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id));

        $liftings = Lifting::query()
            ->where('organization_id', Auth::user()->organization_id)
            ->whereBetween('lifting_date', [$start->toDateString(), $end->toDateString()])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id));

        $sales = (float) $shifts->clone()->sum('total_expected_cash');
        $costs = (float) $liftings->clone()->sum('total_cost');
        $taxes = (float) $shifts->clone()->sum('total_tax_collected');

        return response()->json([
            'data' => [
                'sales' => round($sales, 2),
                'costs' => round($costs, 2),
                'taxes' => round($taxes, 2),
                'net_profit' => round($sales - $costs - $taxes, 2),
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
            ->where('organization_id', Auth::user()->organization_id)
            ->whereBetween('started_at', [$start, $end])
            ->when($stationId, fn (Builder $query, string $id) => $query->where('station_id', $id))
            ->sum('total_tax_collected');

        $paid = (float) Lifting::query()
            ->where('organization_id', Auth::user()->organization_id)
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
            ->where('organization_id', Auth::user()->organization_id)
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
        return new ReportBuilder(Auth::user()->organization_id);
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
