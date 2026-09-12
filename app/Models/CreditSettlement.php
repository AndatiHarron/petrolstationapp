<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A payment clearing part or all of a customer's credit balance.
 *
 * The manager who takes the money records it; an admin approves it. The
 * customer's balance moves only on approval, so the person handling cash cannot
 * also be the one who writes down that it arrived.
 */
class CreditSettlement extends Model
{
    /** @use HasFactory<\Database\Factories\CreditSettlementFactory> */
    use BelongsToOrganization, HasFactory, HasUuids, LogsActivity, SoftDeletes;

    public const STATUS_PENDING = 'PENDING';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_REJECTED = 'REJECTED';

    /** @var list<string> */
    public const METHODS = ['cash', 'mpesa', 'bank', 'cheque'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'balance_before' => 'float',
            'balance_after' => 'float',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'amount', 'method', 'approved_by_user_id', 'rejection_reason'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Credit settlement was {$eventName}");
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Approve the settlement and reduce the customer's balance.
     *
     * Both happen in one transaction: a balance reduced without the settlement
     * being marked approved, or the reverse, would leave the ledger unexplainable.
     * A row is re-read with a lock so two admins approving at once cannot apply
     * the same payment twice.
     */
    public function approve(User $approver): self
    {
        return DB::transaction(function () use ($approver): self {
            /** @var self $fresh */
            $fresh = self::query()->whereKey($this->getKey())->lockForUpdate()->firstOrFail();

            if (! $fresh->isPending()) {
                return $fresh;
            }

            $customer = Customer::query()
                ->whereKey($fresh->customer_id)
                ->lockForUpdate()
                ->firstOrFail();

            $before = (float) $customer->current_balance;
            $after = round($before - (float) $fresh->amount, 2);

            $customer->update(['current_balance' => $after]);

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
     * Reject the settlement. The customer's balance is untouched, because an
     * unapproved payment never moved it in the first place.
     */
    public function reject(User $approver, ?string $reason = null): self
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
