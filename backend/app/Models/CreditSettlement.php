<?php

namespace App\Models;

use App\Concerns\ApprovableSettlement;
use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
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
    use ApprovableSettlement, BelongsToOrganization, HasFactory, HasUuids, LogsActivity, SoftDeletes;

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

    public function allocations(): HasMany
    {
        return $this->hasMany(CreditAllocation::class, 'credit_settlement_id');
    }

    protected function balanceHolder(): Model
    {
        return $this->customer;
    }

    /**
     * Once the money is confirmed, apply it to the customer's oldest unpaid
     * invoices and post it to the ledger.
     *
     * The allocation is what lets the aging report say how old a debt is rather
     * than inferring it from a single balance figure.
     */
    protected function afterApproval(): void
    {
        app(\App\Services\DebtService::class)->allocateSettlement($this);

        try {
            app(\App\Services\LedgerService::class)->postCreditSettlement($this);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
