<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @method static \Illuminate\Database\Eloquent\Builder|MeterReading findOrFail($id)
 * @method static \Illuminate\Database\Eloquent\Builder|MeterReading create(array $attributes)
 */
class MeterReading extends Model
{
    use BelongsToOrganization;
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'gps_coordinates' => 'array',
    ];

    public function organization(): BelongsTo {
        return $this->belongsTo(Organization::class);
    }

    public function shift() : BelongsTo {
        return $this->belongsTo(Shift::class);
    }

    public function nozzle() : BelongsTo {
        return $this->belongsTo(Nozzle::class);
    }
}
