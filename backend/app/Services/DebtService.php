<?php

namespace App\Services;

use App\Models\CreditAllocation;
use App\Models\CreditSale;
use App\Models\CreditSettlement;
use App\Models\Customer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Who owes what, and since when.
 *
 * The aging report used to work backwards from a single balance figure, walking
 * a customer's sales newest-first and calling whatever fitted inside the balance
 * "unpaid". For a customer who pays down steadily that reports genuinely old
 * debt as fresh — which defeats the point of an aging report, since the bucket
 * a debt lands in is the whole reason anyone reads one.
 *
 * Settlements are instead applied to specific invoices, oldest first, and what
 * is left unallocated on each sale is what that sale still owes. The age of
 * that remainder is the age of the sale it sits on.
 */
class DebtService
{
    /**
     * Apply an approved settlement across a customer's open invoices.
     *
     * Oldest first, because that is how a payment is meant to clear debt and
     * because it is the only order that keeps the aging buckets honest.
     *
     * @return float The amount that could not be allocated — a payment larger
     *               than everything outstanding, which leaves the customer in
     *               credit rather than being silently dropped.
     */
    public function allocateSettlement(CreditSettlement $settlement): float
    {
        return DB::transaction(function () use ($settlement): float {
            $remaining = round((float) $settlement->amount, 2);

            $openSales = CreditSale::query()
                ->where('customer_id', $settlement->customer_id)
                ->whereColumn('settled_amount', '<', 'amount')
                ->orderBy('created_at')
                ->lockForUpdate()
                ->get();

            foreach ($openSales as $sale) {
                if ($remaining <= 0) {
                    break;
                }

                $outstanding = round((float) $sale->amount - (float) $sale->settled_amount, 2);

                if ($outstanding <= 0) {
                    continue;
                }

                $applied = min($remaining, $outstanding);

                CreditAllocation::create([
                    'organization_id' => $settlement->organization_id,
                    'credit_sale_id' => $sale->id,
                    'credit_settlement_id' => $settlement->id,
                    'amount' => $applied,
                ]);

                $sale->update([
                    'settled_amount' => round((float) $sale->settled_amount + $applied, 2),
                ]);

                $remaining = round($remaining - $applied, 2);
            }

            return $remaining;
        });
    }

    /**
     * Undo an allocation, for a settlement that is reversed after approval.
     */
    public function deallocateSettlement(CreditSettlement $settlement): void
    {
        DB::transaction(function () use ($settlement): void {
            $allocations = CreditAllocation::query()
                ->where('credit_settlement_id', $settlement->id)
                ->with('creditSale')
                ->get();

            foreach ($allocations as $allocation) {
                $sale = $allocation->creditSale;

                if ($sale) {
                    $sale->update([
                        'settled_amount' => max(0, round((float) $sale->settled_amount - (float) $allocation->amount, 2)),
                    ]);
                }

                $allocation->delete();
            }
        });
    }

    /**
     * Aging for one customer, bucketed by the real age of each unpaid invoice.
     *
     * @return array{buckets: array<string, float>, total: float, oldest_days: int, invoices: list<array<string, mixed>>}
     */
    public function agingFor(Customer $customer, Carbon $asOf, ?string $stationId = null): array
    {
        $openSales = CreditSale::query()
            ->where('customer_id', $customer->id)
            ->where('created_at', '<=', $asOf)
            ->whereColumn('settled_amount', '<', 'amount')
            ->when(
                $stationId,
                fn ($query, $id) => $query->whereHas('shift', fn ($shift) => $shift->where('station_id', $id))
            )
            ->orderBy('created_at')
            ->get();

        $buckets = ['0-30' => 0.0, '31-60' => 0.0, '61-90' => 0.0, '90+' => 0.0];
        $invoices = [];
        $total = 0.0;
        $oldestDays = 0;

        foreach ($openSales as $sale) {
            $outstanding = round((float) $sale->amount - (float) $sale->settled_amount, 2);

            if ($outstanding <= 0) {
                continue;
            }

            $ageInDays = (int) $sale->created_at->startOfDay()->diffInDays($asOf->copy()->startOfDay());
            $oldestDays = max($oldestDays, $ageInDays);

            $bucket = match (true) {
                $ageInDays <= 30 => '0-30',
                $ageInDays <= 60 => '31-60',
                $ageInDays <= 90 => '61-90',
                default => '90+',
            };

            $buckets[$bucket] = round($buckets[$bucket] + $outstanding, 2);
            $total = round($total + $outstanding, 2);

            $invoices[] = [
                'credit_sale_id' => $sale->id,
                'date' => $sale->created_at->toDateString(),
                'age_days' => $ageInDays,
                'bucket' => $bucket,
                'original_amount' => round((float) $sale->amount, 2),
                'settled_amount' => round((float) $sale->settled_amount, 2),
                'outstanding' => $outstanding,
                'vehicle_reg' => $sale->vehicle_reg,
            ];
        }

        // A balance that no open invoice accounts for.
        //
        // It happens for an account opened with a brought-forward figure, and
        // it happens when something has gone wrong. Either way it is owed, so
        // dropping it would understate the debt and hide the discrepancy at the
        // same time. It is reported beside the aged buckets rather than inside
        // one, because it has no invoice date and so has no honest age.
        //
        // Not computed when a station filter is on: the invoices are then
        // narrowed to that station but the account balance is not, and the
        // difference between the two is not an unexplained balance.
        $unallocated = 0.0;

        if ($stationId === null) {
            $unallocated = max(0.0, round((float) $customer->current_balance - $total, 2));
        }

        return [
            'buckets' => $buckets,
            'unallocated' => $unallocated,
            'total' => round($total + $unallocated, 2),
            'aged_total' => $total,
            'oldest_days' => $oldestDays,
            'invoices' => $invoices,
        ];
    }
}
