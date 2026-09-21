<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Lifting extends Model
{
    use BelongsToOrganization;
    use HasFactory;
    use HasUuids;
    use LogsActivity;
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'lifting_date' => 'date',
        'is_credit' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'volume_liters',
                'buying_price_per_liter',
                'tank.name',
            ])
            ->setDescriptionForEvent(fn (string $eventName) => "Lifting {$eventName}");
    }

    /**
     * The cost of a litre in this tank, excluding VAT.
     *
     * VAT paid on a lifting is recoverable, so it is not part of what the fuel
     * cost — including it would overstate cost of sales by the tax rate and
     * understate every margin the P&L reports.
     */
    public function unitCostExcludingTax(): float
    {
        $volume = (float) $this->volume_liters;

        if ($volume <= 0) {
            return 0.0;
        }

        return round(((float) $this->total_cost - (float) ($this->tax_paid ?? 0)) / $volume, 4);
    }

    protected static function booted()
    {
        static::created(function (Lifting $lifting) {
            $tank = $lifting->tank;

            if ($tank) {
                // The average has to be struck against the volume the tank held
                // *before* this delivery, so it is computed ahead of the
                // increment rather than after it.
                $lifting->restrikeAverageCost($tank);

                // 1. Update the current volume
                $tank->increment('current_volume', $lifting->volume_liters);

                // 2. Recalculate the current dip reading
                if (method_exists($tank, 'updateDipFromCurrentVolume')) {
                    $tank->updateDipFromCurrentVolume();
                }
                // 3. Save the changes
                $tank->save();
            }

            // 4. Update Supplier balance if on credit
            if ($lifting->is_credit && $lifting->supplier_id) {
                $lifting->supplier->increment('current_balance', $lifting->total_cost);
            }

            // 5. Mirror the delivery into the general ledger. Never allowed to
            //    fail the receipt itself — the fuel is in the tank either way.
            try {
                app(\App\Services\LedgerService::class)->postLifting($lifting);
            } catch (\Throwable $exception) {
                report($exception);
            }
        });

        static::deleted(function (Lifting $lifting) {
            // On soft delete, reverse inventory and supplier balance.
            $tank = $lifting->tank;

            if ($tank) {
                // 1. Update the current volume
                $lifting->tank->decrement('current_volume', $lifting->volume_liters);

                // 2. Recalculate the current dip reading
                if (method_exists($tank, 'updateDipFromCurrentVolume')) {
                    $tank->updateDipFromCurrentVolume();
                }

                // 3. Save the changes
                $tank->save();
            }

            // 4. Update Supplier balance if on credit
            if ($lifting->is_credit && $lifting->supplier_id) {
                $lifting->supplier->decrement('current_balance', $lifting->total_cost);
            }

            // 5. Withdraw the ledger entry rather than deleting it, so the
            //    delivery and its reversal both stay on the record.
            try {
                app(\App\Services\LedgerService::class)->reverseFor($lifting, 'Lifting was removed');
            } catch (\Throwable $exception) {
                report($exception);
            }
        });

        static::restored(function (Lifting $lifting) {
            // When restoring, re-apply the original inventory effects.
            $tank = $lifting->tank;

            if ($tank) {
                $tank->increment('current_volume', $lifting->volume_liters);

                if (method_exists($tank, 'updateDipFromCurrentVolume')) {
                    $tank->updateDipFromCurrentVolume();
                }

                $tank->save();
            }

            if ($lifting->is_credit && $lifting->supplier_id) {
                $lifting->supplier->increment('current_balance', $lifting->total_cost);
            }

            try {
                app(\App\Services\LedgerService::class)->postLifting($lifting);
            } catch (\Throwable $exception) {
                report($exception);
            }
        });
    }

    /**
     * Re-strike the tank's moving weighted average cost for this delivery.
     *
     * Weighted by volume, because a small top-up at a high price should not move
     * the cost of a full tank as much as a full load at the same price does.
     */
    public function restrikeAverageCost(Tank $tank): void
    {
        $existingVolume = max(0.0, (float) $tank->current_volume);
        $existingCost = $existingVolume * (float) ($tank->average_cost_per_liter ?: 0);

        $incomingVolume = (float) $this->volume_liters;
        $incomingCost = $incomingVolume * $this->unitCostExcludingTax();

        $totalVolume = $existingVolume + $incomingVolume;

        if ($totalVolume <= 0) {
            return;
        }

        $tank->average_cost_per_liter = round(($existingCost + $incomingCost) / $totalVolume, 4);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function tank(): BelongsTo
    {
        return $this->belongsTo(Tank::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
