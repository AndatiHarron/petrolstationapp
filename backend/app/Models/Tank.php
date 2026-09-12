<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * @method static \Illuminate\Database\Eloquent\Builder|Tank findOrFail($id)
 * @method static \Illuminate\Database\Eloquent\Builder|Tank create(array $attributes)
 */
class Tank extends Model
{
    use BelongsToOrganization;
    use HasFactory;
    use HasUuids;
    use LogsActivity;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'name',
                'capacity_liters',
                'current_volume',
                'current_dip_mm',
                'calibration_chart',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Tank configuration was {$eventName}");
    }

    protected $casts = [
        'calibration_chart' => 'array',
        'capacity_liters' => 'decimal:2',
        'current_volume' => 'decimal:2',
    ];

    public function updateDipFromCurrentVolume(): void
    {
        $chart = collect($this->calibration_chart)->sortBy('liters')->values();
        $volume = $this->current_volume;

        if ($chart->isEmpty()) {
            return;
        }

        // 1. Handle Out of Bounds (Below Min
        if ($volume <= $chart->first()['liters']) {
            $this->current_dip_mm = $chart->first()['mm'];

            return;
        }

        // 2. Handle Out of Bounds (Above Max)
        if ($volume >= $chart->last()['liters']) {
            $this->current_dip_mm = $chart->last()['mm'];

            return;
        }

        // 3. Interpolate (Find the specific bracket)
        for ($i = 0; $i < $chart->count() - 1; $i++) {
            $lower = $chart[$i];
            $upper = $chart[$i + 1];

            if ($volume >= $lower['liters'] && $volume <= $upper['liters']) {
                // Calculate the ratio of where the volume falls in this segment
                $rangeLiters = $upper['liters'] - $lower['liters'];
                $rangeMm = $upper['mm'] - $lower['mm'];

                if ($rangeLiters == 0) {
                    $this->current_dip_mm = $lower['mm'];

                    return;
                }

                $fraction = ($volume - $lower['liters']) / $rangeLiters;

                // Apply ratio to the mm height
                $this->current_dip_mm = $lower['mm'] + ($fraction * $rangeMm);

                return;
            }
        }
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function liftings(): HasMany
    {
        return $this->hasMany(Lifting::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function nozzles(): HasMany
    {
        return $this->hasMany(Nozzle::class);
    }

    public function dipReadings(): HasMany
    {
        return $this->hasMany(DipReading::class);
    }
}
