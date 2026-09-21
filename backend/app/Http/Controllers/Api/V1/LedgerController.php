<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Services\LedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * Reading the general ledger.
 *
 * Nothing here writes. Entries are posted by the events that cause them — a
 * shift closing, a delivery arriving, a settlement being approved — and never
 * by hand, so there is no endpoint to create one.
 */
class LedgerController extends Controller
{
    public function __construct(protected LedgerService $ledger) {}

    /**
     * The chart of accounts, with each account's current balance.
     */
    public function accounts(ReportFilterRequest $request)
    {
        Gate::authorize('viewLedger', LedgerEntry::class);

        $organizationId = Auth::user()->organization_id;

        $trial = $this->ledger->trialBalance(
            $organizationId,
            $request->startDate(),
            $request->endDate(),
            $request->stationId(),
        );

        return response()->json([
            'data' => $trial['accounts'],
            'meta' => [
                'totals' => $trial['totals'],
                'start_date' => $request->startDate()->toDateString(),
                'end_date' => $request->endDate()->toDateString(),
            ],
        ]);
    }

    /**
     * The trial balance on its own — the proof that the books balance.
     */
    public function trialBalance(ReportFilterRequest $request)
    {
        Gate::authorize('viewLedger', LedgerEntry::class);

        $trial = $this->ledger->trialBalance(
            Auth::user()->organization_id,
            $request->startDate(),
            $request->endDate(),
            $request->stationId(),
        );

        return response()->json([
            'data' => $trial,
            'meta' => [
                'start_date' => $request->startDate()->toDateString(),
                'end_date' => $request->endDate()->toDateString(),
            ],
        ]);
    }

    /**
     * The journal: every entry, newest first, with its lines.
     */
    public function entries(ReportFilterRequest $request)
    {
        Gate::authorize('viewLedger', LedgerEntry::class);

        $entries = LedgerEntry::query()
            ->with(['lines.account', 'station:id,name', 'createdBy:id,name'])
            ->whereBetween('entry_date', [
                $request->startDate()->toDateString(),
                $request->endDate()->toDateString(),
            ])
            ->when($request->stationId(), fn ($query, $id) => $query->where('station_id', $id))
            ->when($request->input('type'), fn ($query, $type) => $query->where('type', $type))
            ->orderByDesc('entry_date')
            ->orderByDesc('created_at')
            ->paginate(25);

        $entries->getCollection()->transform(fn (LedgerEntry $entry) => [
            'id' => $entry->id,
            'date' => $entry->entry_date->toDateString(),
            'type' => $entry->type,
            'memo' => $entry->memo,
            'station' => $entry->station?->name,
            'posted_by' => $entry->createdBy?->name,
            'is_reversal' => $entry->type === LedgerEntry::TYPE_REVERSAL,
            'total_debit' => (float) $entry->total_debit,
            'total_credit' => (float) $entry->total_credit,
            'balanced' => $entry->isBalanced(),
            'lines' => $entry->lines->map(fn (LedgerLine $line) => [
                'account_code' => $line->account->code,
                'account_name' => $line->account->name,
                'debit' => (float) $line->debit,
                'credit' => (float) $line->credit,
                'memo' => $line->memo,
            ])->values(),
        ]);

        return response()->json($entries);
    }

    /**
     * One account's movements, with a running balance.
     *
     * This is the answer to "why is Accounts Receivable that number" — every
     * line that made it, in order, adding up to what the screen shows.
     */
    public function account(ReportFilterRequest $filter, string $code)
    {
        Gate::authorize('viewLedger', LedgerEntry::class);

        $account = LedgerAccount::query()
            ->where('code', strtoupper($code))
            ->firstOrFail();

        $lines = LedgerLine::query()
            ->where('ledger_account_id', $account->id)
            ->with(['entry.station:id,name', 'party'])
            ->join('ledger_entries', 'ledger_entries.id', '=', 'ledger_lines.ledger_entry_id')
            ->whereBetween('ledger_entries.entry_date', [
                $filter->startDate()->toDateString(),
                $filter->endDate()->toDateString(),
            ])
            ->when(
                $filter->stationId(),
                fn ($query, $id) => $query->where('ledger_entries.station_id', $id)
            )
            ->orderBy('ledger_entries.entry_date')
            ->orderBy('ledger_entries.created_at')
            ->select('ledger_lines.*')
            ->get();

        $running = 0.0;

        $rows = $lines->map(function (LedgerLine $line) use ($account, &$running): array {
            $movement = $account->normal_balance === LedgerAccount::DEBIT
                ? (float) $line->debit - (float) $line->credit
                : (float) $line->credit - (float) $line->debit;

            $running = round($running + $movement, 2);

            return [
                'id' => $line->id,
                'date' => $line->entry->entry_date->toDateString(),
                'type' => $line->entry->type,
                'memo' => $line->memo ?? $line->entry->memo,
                'party' => $line->party?->name,
                'station' => $line->entry->station?->name,
                'debit' => (float) $line->debit,
                'credit' => (float) $line->credit,
                'balance' => $running,
            ];
        });

        return response()->json([
            'data' => $rows,
            'meta' => [
                'account' => [
                    'code' => $account->code,
                    'name' => $account->name,
                    'type' => $account->type,
                    'normal_balance' => $account->normal_balance,
                    'description' => $account->description,
                ],
                'closing_balance' => $running,
                'start_date' => $filter->startDate()->toDateString(),
                'end_date' => $filter->endDate()->toDateString(),
            ],
        ]);
    }
}
