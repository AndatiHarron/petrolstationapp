<?php

namespace App\Services;

use App\Models\CreditSettlement;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\Lifting;
use App\Models\Shift;
use App\Models\SupplierSettlement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * The general ledger.
 *
 * Everything that moves money posts through here, and nothing posts anywhere
 * else. One place means one set of rules about what balances against what, and
 * a single answer to "where did this figure come from".
 *
 * Two invariants hold for every entry written:
 *
 *   1. Debits equal credits. An unbalanced entry is refused, not rounded.
 *   2. Nothing is edited or deleted. A restated shift reverses its old entry in
 *      full and posts a new one, so both remain readable side by side.
 */
class LedgerService
{
    /**
     * The chart of accounts for an organization, keyed by code.
     *
     * Created on first use rather than by a seeder, so an organization signed up
     * after this shipped is never missing the accounts its first sale needs.
     *
     * @return array<string, LedgerAccount>
     */
    public function accounts(string $organizationId): array
    {
        $existing = LedgerAccount::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->get()
            ->keyBy('code');

        foreach (LedgerAccount::SYSTEM_ACCOUNTS as $code => $definition) {
            if ($existing->has($code)) {
                continue;
            }

            $existing->put($code, LedgerAccount::withoutGlobalScopes()->create([
                'organization_id' => $organizationId,
                'code' => $code,
                'name' => $definition['name'],
                'type' => $definition['type'],
                'normal_balance' => $definition['normal'],
                'description' => $definition['description'],
                'is_system' => true,
            ]));
        }

        return $existing->all();
    }

    /**
     * Write one balanced entry.
     *
     * @param  list<array{account: string, debit?: float, credit?: float, memo?: string, party?: \Illuminate\Database\Eloquent\Model|null}>  $lines
     */
    public function post(
        string $organizationId,
        string $type,
        Carbon $date,
        array $lines,
        ?string $memo = null,
        ?object $source = null,
        ?string $stationId = null,
        ?string $reversesEntryId = null,
    ): ?LedgerEntry {
        $accounts = $this->accounts($organizationId);

        // Drop the lines that would post nothing. A shift with no M-Pesa should
        // not leave a row of zeroes on the M-Pesa account for every day of the
        // month — an account's history should be the times it actually moved.
        $material = array_values(array_filter(
            $lines,
            fn (array $line): bool => round((float) ($line['debit'] ?? 0), 2) !== 0.0
                || round((float) ($line['credit'] ?? 0), 2) !== 0.0
        ));

        if ($material === []) {
            return null;
        }

        $totalDebit = round(array_sum(array_map(fn ($l) => (float) ($l['debit'] ?? 0), $material)), 2);
        $totalCredit = round(array_sum(array_map(fn ($l) => (float) ($l['credit'] ?? 0), $material)), 2);

        // A cent of tolerance, because the amounts arrive already rounded from
        // separate calculations. Anything larger is a real modelling mistake and
        // must stop here rather than becoming a ledger nobody can trust.
        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new RuntimeException(
                "Refusing to post an unbalanced {$type} entry: debits {$totalDebit} against credits {$totalCredit}."
            );
        }

        return DB::transaction(function () use (
            $organizationId, $type, $date, $material, $memo, $source, $stationId,
            $reversesEntryId, $accounts, $totalDebit, $totalCredit
        ): LedgerEntry {
            $entry = LedgerEntry::withoutGlobalScopes()->create([
                'organization_id' => $organizationId,
                'station_id' => $stationId,
                'entry_date' => $date->toDateString(),
                'type' => $type,
                'memo' => $memo,
                'source_type' => $source ? $source::class : null,
                'source_id' => $source?->getKey(),
                'reverses_entry_id' => $reversesEntryId,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'created_by_user_id' => Auth::id(),
            ]);

            foreach ($material as $line) {
                $account = $accounts[$line['account']] ?? null;

                if (! $account) {
                    throw new RuntimeException("Unknown ledger account code: {$line['account']}.");
                }

                $party = $line['party'] ?? null;

                LedgerLine::withoutGlobalScopes()->create([
                    'organization_id' => $organizationId,
                    'ledger_entry_id' => $entry->id,
                    'ledger_account_id' => $account->id,
                    'debit' => round((float) ($line['debit'] ?? 0), 2),
                    'credit' => round((float) ($line['credit'] ?? 0), 2),
                    'memo' => $line['memo'] ?? null,
                    'party_type' => $party ? $party::class : null,
                    'party_id' => $party?->getKey(),
                ]);
            }

            return $entry;
        });
    }

    /**
     * Post the mirror image of an entry.
     *
     * Used when a shift is restated: the original stays, its reversal cancels
     * it, and the corrected figures post as a third entry. Reading the three in
     * order tells you what was recorded, that it was withdrawn, and what
     * replaced it — which a silent overwrite never could.
     */
    public function reverse(LedgerEntry $entry, ?string $reason = null): ?LedgerEntry
    {
        // Never reverse the same entry twice, or a correction applied twice
        // would credit back money that was only ever debited once.
        $alreadyReversed = LedgerEntry::withoutGlobalScopes()
            ->where('reverses_entry_id', $entry->id)
            ->exists();

        if ($alreadyReversed) {
            return null;
        }

        $accounts = LedgerAccount::withoutGlobalScopes()
            ->where('organization_id', $entry->organization_id)
            ->get()
            ->keyBy('id');

        $lines = $entry->lines->map(fn (LedgerLine $line): array => [
            'account' => $accounts[$line->ledger_account_id]->code,
            // Swapped: a debit is undone by a credit of the same size.
            'debit' => $line->credit,
            'credit' => $line->debit,
            'memo' => $line->memo,
            'party' => $line->party,
        ])->all();

        return $this->post(
            organizationId: $entry->organization_id,
            type: LedgerEntry::TYPE_REVERSAL,
            date: $entry->entry_date,
            lines: $lines,
            memo: $reason ?? "Reversal of {$entry->type} entry",
            source: $entry->source,
            stationId: $entry->station_id,
            reversesEntryId: $entry->id,
        );
    }

    /**
     * Withdraw whatever this source posted before, so it can be posted again.
     */
    public function reverseFor(object $source, string $reason): void
    {
        LedgerEntry::withoutGlobalScopes()
            ->where('source_type', $source::class)
            ->where('source_id', $source->getKey())
            ->where('type', '!=', LedgerEntry::TYPE_REVERSAL)
            ->with('lines')
            ->get()
            ->each(fn (LedgerEntry $entry) => $this->reverse($entry, $reason));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Posting rules
    // ─────────────────────────────────────────────────────────────────────

    /**
     * A reconciled shift.
     *
     *   DR Cash / M-Pesa / Receivables   what was actually collected
     *   DR Cash Over-Short               the shortage, where money is missing
     *   CR Sales                         revenue net of VAT
     *   CR VAT Payable                   the tax portion of that revenue
     *
     * plus the stock side, at moving-average cost:
     *
     *   DR Cost of Sales                 what the litres sold cost
     *   CR Fuel Stock                    the same, leaving the tank
     *
     * An overage credits Cash Over-Short instead, which is how a surplus reads
     * in a P&L: a negative cost, not income.
     */
    public function postShiftSale(Shift $shift): ?LedgerEntry
    {
        $this->reverseFor($shift, "Shift {$shift->shift_number} was restated");

        $shift->loadMissing(['payments', 'creditSales.customer', 'dipReadings.tank']);

        $gross = round((float) $shift->total_expected_cash, 2);
        $vat = round((float) $shift->total_tax_collected, 2);
        $net = round($gross - $vat, 2);

        if ($gross <= 0) {
            return null;
        }

        $cash = round((float) $shift->payments->where('method', 'cash')->sum('amount'), 2);
        $mpesa = round((float) $shift->payments->where('method', 'mpesa')->sum('amount'), 2);

        $lines = [
            ['account' => 'CASH', 'debit' => $cash, 'memo' => 'Cash collected'],
            ['account' => 'MPESA', 'debit' => $mpesa, 'memo' => 'M-Pesa collected'],
            ['account' => 'SALES', 'credit' => $net, 'memo' => 'Fuel sales net of VAT'],
            ['account' => 'VAT_OUTPUT', 'credit' => $vat, 'memo' => 'Output VAT on sales'],
        ];

        // Receivables are posted per customer, not as one lump, so the ledger
        // can answer what any single customer owes without going back to the
        // credit sales table.
        foreach ($shift->creditSales as $creditSale) {
            $lines[] = [
                'account' => 'AR',
                'debit' => round((float) $creditSale->amount, 2),
                'memo' => 'Credit sale to '.($creditSale->customer->name ?? 'customer'),
                'party' => $creditSale->customer,
            ];
        }

        $variance = round((float) $shift->cash_variance, 2);

        if ($variance < 0) {
            // Collected less than was owed: the difference is a shortage.
            $lines[] = ['account' => 'CASH_VARIANCE', 'debit' => abs($variance), 'memo' => 'Shift shortage'];
        } elseif ($variance > 0) {
            $lines[] = ['account' => 'CASH_VARIANCE', 'credit' => $variance, 'memo' => 'Shift overage'];
        }

        $entry = $this->post(
            organizationId: $shift->organization_id,
            type: LedgerEntry::TYPE_SHIFT_SALE,
            date: Carbon::parse($shift->started_at ?? $shift->created_at),
            lines: $lines,
            memo: "Shift {$shift->shift_number} reconciled",
            source: $shift,
            stationId: $shift->station_id,
        );

        $this->postShiftStockMovement($shift);

        return $entry;
    }

    /**
     * The cost side of a shift: what left the tanks, and what never arrived.
     */
    protected function postShiftStockMovement(Shift $shift): void
    {
        $lines = [];
        $costOfSales = 0.0;
        $varianceValue = 0.0;

        foreach ($shift->dipReadings as $dip) {
            $tank = $dip->tank;

            if (! $tank) {
                continue;
            }

            $unitCost = (float) ($tank->average_cost_per_liter ?: 0);

            if ($unitCost <= 0) {
                // No delivery has ever been costed into this tank, so there is
                // no honest figure to post. Silence beats a made-up number.
                continue;
            }

            $sold = (float) ($dip->expected_volume_liters !== null
                ? ($dip->opening_volume_liters - $dip->expected_volume_liters)
                : 0);

            $costOfSales += $sold * $unitCost;
            $varianceValue += (float) ($dip->variance_liters ?? 0) * $unitCost;
        }

        $costOfSales = round($costOfSales, 2);
        $varianceValue = round($varianceValue, 2);

        if ($costOfSales > 0) {
            $lines[] = ['account' => 'COGS', 'debit' => $costOfSales, 'memo' => 'Cost of fuel sold'];
            $lines[] = ['account' => 'STOCK', 'credit' => $costOfSales, 'memo' => 'Fuel issued from tanks'];
        }

        if ($varianceValue < 0) {
            // Less in the tank than the books say: a loss, and stock has to come
            // down by the value of what is not there.
            $lines[] = ['account' => 'STOCK_VARIANCE', 'debit' => abs($varianceValue), 'memo' => 'Wet stock loss'];
            $lines[] = ['account' => 'STOCK', 'credit' => abs($varianceValue), 'memo' => 'Wet stock loss'];
        } elseif ($varianceValue > 0) {
            $lines[] = ['account' => 'STOCK', 'debit' => $varianceValue, 'memo' => 'Wet stock gain'];
            $lines[] = ['account' => 'STOCK_VARIANCE', 'credit' => $varianceValue, 'memo' => 'Wet stock gain'];
        }

        if ($lines === []) {
            return;
        }

        $this->post(
            organizationId: $shift->organization_id,
            type: LedgerEntry::TYPE_SHIFT_SALE,
            date: Carbon::parse($shift->started_at ?? $shift->created_at),
            lines: $lines,
            memo: "Shift {$shift->shift_number} stock movement",
            source: $shift,
            stationId: $shift->station_id,
        );
    }

    /**
     * A delivery.
     *
     *   DR Fuel Stock        the cost of the fuel, excluding recoverable VAT
     *   DR VAT Recoverable   the tax paid on it
     *   CR Payables or Cash  depending on whether it was taken on credit
     */
    public function postLifting(Lifting $lifting): ?LedgerEntry
    {
        $this->reverseFor($lifting, 'Lifting was restated');

        $lifting->loadMissing('supplier');

        $total = round((float) $lifting->total_cost, 2);
        $inputTax = round((float) ($lifting->tax_paid ?? 0), 2);
        $stockValue = round($total - $inputTax, 2);

        if ($total <= 0) {
            return null;
        }

        $lines = [
            ['account' => 'STOCK', 'debit' => $stockValue, 'memo' => 'Fuel received into tank'],
            ['account' => 'VAT_INPUT', 'debit' => $inputTax, 'memo' => 'Input VAT on lifting'],
        ];

        if ($lifting->is_credit && $lifting->supplier_id) {
            $lines[] = [
                'account' => 'AP',
                'credit' => $total,
                'memo' => 'Owed to '.($lifting->supplier->name ?? 'supplier'),
                'party' => $lifting->supplier,
            ];
        } else {
            $lines[] = ['account' => 'CASH', 'credit' => $total, 'memo' => 'Delivery paid for on collection'];
        }

        return $this->post(
            organizationId: $lifting->organization_id,
            type: LedgerEntry::TYPE_LIFTING,
            date: Carbon::parse($lifting->lifting_date),
            lines: $lines,
            memo: 'Lifting '.($lifting->invoice_number ?: 'delivery').' received',
            source: $lifting,
            stationId: $lifting->station_id,
        );
    }

    /**
     * A customer paying down their balance: cash in, receivable down.
     */
    public function postCreditSettlement(CreditSettlement $settlement): ?LedgerEntry
    {
        $settlement->loadMissing('customer');

        $amount = round((float) $settlement->amount, 2);
        $debitAccount = $settlement->method === 'mpesa' ? 'MPESA' : 'CASH';

        return $this->post(
            organizationId: $settlement->organization_id,
            type: LedgerEntry::TYPE_CREDIT_SETTLEMENT,
            date: Carbon::parse($settlement->approved_at ?? now()),
            lines: [
                ['account' => $debitAccount, 'debit' => $amount, 'memo' => 'Received from customer'],
                [
                    'account' => 'AR',
                    'credit' => $amount,
                    'memo' => 'Settled by '.($settlement->customer->name ?? 'customer'),
                    'party' => $settlement->customer,
                ],
            ],
            memo: 'Credit settlement from '.($settlement->customer->name ?? 'customer'),
            source: $settlement,
            stationId: $settlement->station_id,
        );
    }

    /**
     * Paying a supplier: payable down, cash out.
     */
    public function postSupplierSettlement(SupplierSettlement $settlement): ?LedgerEntry
    {
        $settlement->loadMissing('supplier');

        $amount = round((float) $settlement->amount, 2);
        $creditAccount = $settlement->method === 'mpesa' ? 'MPESA' : 'CASH';

        return $this->post(
            organizationId: $settlement->organization_id,
            type: LedgerEntry::TYPE_SUPPLIER_SETTLEMENT,
            date: Carbon::parse($settlement->approved_at ?? now()),
            lines: [
                [
                    'account' => 'AP',
                    'debit' => $amount,
                    'memo' => 'Paid to '.($settlement->supplier->name ?? 'supplier'),
                    'party' => $settlement->supplier,
                ],
                ['account' => $creditAccount, 'credit' => $amount, 'memo' => 'Supplier payment'],
            ],
            memo: 'Payment to '.($settlement->supplier->name ?? 'supplier'),
            source: $settlement,
            stationId: $settlement->station_id,
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Reading the ledger
    // ─────────────────────────────────────────────────────────────────────

    /**
     * The trial balance: every account, its debits and credits, and the proof
     * that the two columns agree.
     *
     * @return array{accounts: list<array<string, mixed>>, totals: array<string, float>}
     */
    public function trialBalance(
        string $organizationId,
        ?Carbon $from = null,
        ?Carbon $to = null,
        ?string $stationId = null,
    ): array {
        $accounts = $this->accounts($organizationId);

        $totals = LedgerLine::withoutGlobalScopes()
            ->where('ledger_lines.organization_id', $organizationId)
            ->join('ledger_entries', 'ledger_entries.id', '=', 'ledger_lines.ledger_entry_id')
            ->when($from, fn ($q, $date) => $q->whereDate('ledger_entries.entry_date', '>=', $date->toDateString()))
            ->when($to, fn ($q, $date) => $q->whereDate('ledger_entries.entry_date', '<=', $date->toDateString()))
            ->when($stationId, fn ($q, $id) => $q->where('ledger_entries.station_id', $id))
            ->groupBy('ledger_lines.ledger_account_id')
            ->selectRaw('ledger_lines.ledger_account_id, SUM(ledger_lines.debit) as debit, SUM(ledger_lines.credit) as credit')
            ->get()
            ->keyBy('ledger_account_id');

        $rows = [];
        $debitTotal = 0.0;
        $creditTotal = 0.0;

        foreach ($accounts as $code => $account) {
            $debit = round((float) ($totals[$account->id]->debit ?? 0), 2);
            $credit = round((float) ($totals[$account->id]->credit ?? 0), 2);

            if ($debit === 0.0 && $credit === 0.0) {
                continue;
            }

            $debitTotal += $debit;
            $creditTotal += $credit;

            $rows[] = [
                'code' => $code,
                'name' => $account->name,
                'type' => $account->type,
                'normal_balance' => $account->normal_balance,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $account->signedBalance($debit, $credit),
            ];
        }

        return [
            'accounts' => $rows,
            'totals' => [
                'debit' => round($debitTotal, 2),
                'credit' => round($creditTotal, 2),
                'difference' => round($debitTotal - $creditTotal, 2),
                'balanced' => abs($debitTotal - $creditTotal) < 0.01,
            ],
        ];
    }
}
