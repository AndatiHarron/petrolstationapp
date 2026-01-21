<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';
    protected $guarded = [];

    public function users(): HasMany {
        return $this->hasMany(User::class);
    }

    public function stations(): HasMany {
        return $this->hasMany(Station::class);
    }

    public function products(): HasMany {
        return $this->hasMany(Product::class);
    }

    public function tanks(): HasMany {
        return $this->hasMany(Tank::class);
    }

    public function nozzles(): HasMany {
        return $this->hasMany(Nozzle::class);
    }

    public function shifts(): HasMany {
        return $this->hasMany(Shift::class);
    }

    public function meterReadings(): HasMany {
        return $this->hasMany(MeterReading::class);
    }

    public function dipReadings(): HasMany {
        return $this->hasMany(DipReading::class);
    }

    public function payments(): HasMany {
        return $this->hasMany(Organization::class);
    }
}
