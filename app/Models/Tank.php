<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @method static \Illuminate\Database\Eloquent\Builder|Tank findOrFail($id)
 * @method static \Illuminate\Database\Eloquent\Builder|Tank create(array $attributes)
 */
class Tank extends Model
{
    use BelongsToOrganization;
    use HasUuids;
    public $incrementing = false;

    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'calibration_chart' => 'array',
        'capacity_liters' => 'decimal:2',
        'current_volume' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function station() : BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function nozzles(): HasMany {
        return $this->hasMany(Nozzle::class);
    }

    public function dipReadings(): HasMany {
        return $this->hasMany(DipReading::class);
    }
}
