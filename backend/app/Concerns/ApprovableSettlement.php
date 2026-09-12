<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Shared behaviour for a payment that one person records and another approves.
 *
 * Customer credit and supplier debt move in opposite directions in the business
 * but identically in the data: a payment reduces the outstanding balance either
 * way. The approval mechanics — the lock, the transaction, the recorded balance
 * trail — are the part worth having in one place, because getting them subtly
 * different between the two would be a money bug.
 *
 * The using model supplies which record holds the balance.
 */
trait ApprovableSettlement
{
    public const STATUS_PENDING = 'PENDING';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_REJECTED = 'REJECTED';

    /** @var list<string> */
    public const METHODS = ['cash', 'mpesa', 'bank', 'cheque'];

    /**
     * The record whose `current_balance` this payment settles.
     */
    abstract protected function balanceHolder(): Model;

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Approve the payment and reduce the outstanding balance.
     *
     * Both happen in one transaction: a balance reduced without the payment
     * being marked approved, or the reverse, would leave the ledger
     * unexplainable. Each row is re-read under a lock so two approvers acting at
     * the same moment cannot apply one payment twice.
     */
    public function approve(User $approver): static
    {
        return DB::transaction(function () use ($approver): static {
            /** @var static $fresh */
            $fresh = static::query()->whereKey($this->getKey())->lockForUpdate()->firstOrFail();

            if (! $fresh->isPending()) {
                return $fresh;
            }

            $holder = $fresh->balanceHolder()->newQuery()
                ->whereKey($fresh->balanceHolder()->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $before = (float) $holder->current_balance;
            $after = round($before - (float) $fresh->amount, 2);

            $holder->update(['current_balance' => $after]);

            $fresh->update([
                'status' => self::STATUS_APPROVED,
                'approved_by_user_id' => $approver->getKey(),
                'approved_at' => now(),
                'balance_before' => $before,
                'balance_after' => $after,
            ]);

            return $fresh->refresh();
        });
    }

    /**
     * Reject it. The balance is untouched, because an unapproved payment never
     * moved it in the first place.
     */
    public function reject(User $approver, ?string $reason = null): static
    {
        if (! $this->isPending()) {
            return $this;
        }

        $this->update([
            'status' => self::STATUS_REJECTED,
            'approved_by_user_id' => $approver->getKey(),
            'rejected_at' => now(),
            'rejection_reason' => $reason,
        ]);

        return $this->refresh();
    }
}
