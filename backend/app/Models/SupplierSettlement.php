<?php

namespace App\Models;

use App\Concerns\ApprovableSettlement;
use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A payment reducing what the station owes a supplier.
 *
 * Recorded by whoever pays, approved by an admin. See ApprovableSettlement for
 * the approval mechanics, which are shared with customer credit.
 */
class SupplierSettlement extends Model
{
    /** @use HasFactory<\Database\Factories\SupplierSettlementFactory> */
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
            ->setDescriptionForEvent(fn (string $eventName) => "Supplier payment was {$eventName}");
    }

    protected function balanceHolder(): Model
    {
        return $this->supplier;
    }

    /**
     * Post the payment to the ledger once it is approved: the payable comes
     * down, the cash or M-Pesa balance goes with it.
     */
    protected function afterApproval(): void
    {
        try {
            app(\App\Services\LedgerService::class)->postSupplierSettlement($this);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
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
}
