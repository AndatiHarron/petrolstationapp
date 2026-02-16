<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Lifting;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Debt Aging Report
     */
    public function debtAging()
    {
        $organizationId = Auth::user()->organization_id;

        $customers = Customer::where('organization_id', $organizationId)
            ->where('current_balance', '>', 0)
            ->get();

        $report = $customers->map(function ($customer) {
            $sales = CreditSale::where('customer_id', $customer->id)
                ->orderBy('created_at', 'desc')
                ->get();

            $buckets = [
                '0-30' => 0,
                '31-60' => 0,
                '61-90' => 0,
                '90+' => 0,
            ];

            $remainingBalance = $customer->current_balance;

            foreach ($sales as $sale) {
                if ($remainingBalance <= 0) {
                    break;
                }

                $amountToCategorize = min($remainingBalance, $sale->amount);
                $ageInDays = $sale->created_at->diffInDays(now());

                if ($ageInDays <= 30) {
                    $buckets['0-30'] += $amountToCategorize;
                } elseif ($ageInDays <= 60) {
                    $buckets['31-60'] += $amountToCategorize;
                } elseif ($ageInDays <= 90) {
                    $buckets['61-90'] += $amountToCategorize;
                } else {
                    $buckets['90+'] += $amountToCategorize;
                }

                $remainingBalance -= $amountToCategorize;
            }

            return [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'total_debt' => (float) $customer->current_balance,
                'buckets' => $buckets,
            ];
        });

        return response()->json(['data' => $report]);
    }

    /**
     * Profit & Loss Report
     */
    public function pl(Request $request)
    {
        $organizationId = Auth::user()->organization_id;

        $start = $request->input('start_date', now()->startOfMonth());
        $end = $request->input('end_date', now()->endOfMonth());

        $sales = Shift::where('organization_id', $organizationId)
            ->whereBetween('created_at', [$start, $end])
            ->sum('total_expected_cash');

        $costs = Lifting::where('organization_id', $organizationId)
            ->whereBetween('created_at', [$start, $end])
            ->sum('total_cost');

        $taxes = Shift::where('organization_id', $organizationId)
            ->whereBetween('created_at', [$start, $end])
            ->sum('total_tax_collected');

        return response()->json([
            'data' => [
                'sales' => (float) $sales,
                'costs' => (float) $costs,
                'taxes' => (float) $taxes,
                'net_profit' => (float) ($sales - $costs - $taxes),
            ],
        ]);
    }

    /**
     * Tax Summary Report
     */
    public function taxSummary(Request $request)
    {
        $organizationId = Auth::user()->organization_id;
        $month = $request->input('month', now()->month);
        $year = $request->input('year', now()->year);

        $collected = Shift::where('organization_id', $organizationId)
            ->whereMonth('created_at', $month)
            ->whereYear('created_at', $year)
            ->sum('total_tax_collected');

        $paid = Lifting::where('organization_id', $organizationId)
            ->whereMonth('created_at', $month)
            ->whereYear('created_at', $year)
            ->sum('tax_paid');

        return response()->json([
            'data' => [
                'tax_collected' => (float) $collected,
                'tax_paid' => (float) $paid,
                'net_tax' => (float) ($collected - $paid),
            ],
        ]);
    }

    /**
     * Variance Trend Report
     */
    public function varianceTrend(Request $request)
    {
        $organizationId = Auth::user()->organization_id;
        $days = (int) $request->input('days', 7);

        $variances = Shift::where('organization_id', $organizationId)
            ->where('created_at', '>=', now()->subDays($days))
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(cash_variance) as total_variance')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $data = $variances->map(function ($item) {
            $item->total_variance = (float) $item->total_variance;

            return $item;
        });

        return response()->json(['data' => $data]);
    }
}
