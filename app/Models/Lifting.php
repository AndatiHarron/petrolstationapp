<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Lifting extends Model
{
    use BelongsToOrganization;
    use HasFactory;
    use HasUuids;
    use LogsActivity;

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

    protected static function booted()
    {
        static::created(function (Lifting $lifting) {
            $tank = $lifting->tank;

            // 1. Update the current volume
            if ($tank) {
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
        });

        static::deleted(function (Lifting $lifting) {
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
        });
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
