<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @method static \Illuminate\Database\Eloquent\Builder|Nozzle findOrFail($id)
 * @method static \Illuminate\Database\Eloquent\Builder|Nozzle create(array $attributes)
 */
class Nozzle extends Model
{
    use BelongsToOrganization;
    use HasUuids;
    public $incrementing = false;

    protected $keyType = 'string';
    protected $guarded = [];

    public function organization(): BelongsTo {
        return $this->belongsTo(Organization::class);
    }

    public function station(): BelongsTo {
        return $this->belongsTo(Station::class);
    }

    public function tank(): BelongsTo {
        return $this->belongsTo(Tank::class);
    }

    public function meterReadings(): HasMany {
        return $this->hasMany(MeterReading::class);
    }
}
