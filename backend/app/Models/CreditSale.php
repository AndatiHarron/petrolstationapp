<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CreditSale extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids, LogsActivity, SoftDeletes;

    protected $guarded = [];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'amount',
                'vehicle_reg',
                'notes',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Credit sale was {$eventName}");
    }

    protected $casts = [
        'amount' => 'float',
        'settled_amount' => 'float',
    ];

    /**
     * A credit sale moves the customer's balance, so every way it can come and
     * go has to move it back.
     *
     * Only `created` was handled before. Re-reconciling a shift deletes its
     * credit sales and writes them again — so an approved correction counted
     * the same debt twice, and the customer's balance climbed by the value of
     * their credit sales every time an admin approved an edit.
     */
    protected static function booted(): void
    {
        static::created(function (CreditSale $creditSale) {
            $creditSale->customer?->increment('current_balance', $creditSale->amount);
        });

        static::deleted(function (CreditSale $creditSale) {
            // The debt is only owed while the sale stands. `deleted` fires for
            // the soft delete too, which is the case that was double-counting.
            $creditSale->customer?->decrement(
                'current_balance',
                (float) $creditSale->amount - (float) $creditSale->settled_amount
            );
        });

        static::restored(function (CreditSale $creditSale) {
            $creditSale->customer?->increment(
                'current_balance',
                (float) $creditSale->amount - (float) $creditSale->settled_amount
            );
        });
    }

    /** What this sale still owes, after any settlements applied to it. */
    public function outstanding(): float
    {
        return round((float) $this->amount - (float) $this->settled_amount, 2);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(CreditAllocation::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
