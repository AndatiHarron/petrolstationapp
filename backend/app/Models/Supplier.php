<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use BelongsToOrganization;

    /** @use HasFactory<\Database\Factories\SupplierFactory> */
    use HasFactory;
    use HasUuids;

    protected $guarded = [];

    protected $casts = [
        'current_balance' => 'float',
    ];

    public function liftings(): HasMany
    {
        return $this->hasMany(Lifting::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
