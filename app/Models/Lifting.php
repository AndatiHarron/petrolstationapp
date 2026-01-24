<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lifting extends Model
{
    use HasFactory;
    use HasUuids;
    use BelongsToOrganization;

    protected $guarded = [];

    protected $casts = [
        'lifting_date' => 'date',
    ];

    protected static function booted()
    {
        static::created(function (Lifting $lifting) {
            $tank = $lifting->tank;

            // 1. Update the current volume
            $tank->increment('current_volume', $lifting->volume_liters);

            // 2. Recalculate the current dip reading
            $tank->updateDipFromCurrentVolume();

            // 3. Save the changes
            $tank->save();
        });

        static::deleted(function (Lifting $lifting) {
            $tank = $lifting->tank;

            // 1. Update the current volume
            $lifting->tank->decrement('current_volume', $lifting->volume_liters);

            // 2. Recalculate the current dip reading
            $tank->updateDipFromCurrentVolume();

            // 3. Save the changes
            $tank->save();
        });
    }

    public function organization(): BelongsTo {
        return $this->belongsTo(Organization::class);
    }

    public function station(): BelongsTo {
        return $this->belongsTo(Station::class);
    }

    public function tank(): BelongsTo {
        return $this->belongsTo(Tank::class);
    }
}
