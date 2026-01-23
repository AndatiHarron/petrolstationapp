<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditSale extends Model
{
    use HasFactory, BelongsToOrganization, HasUuids;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::created(function (CreditSale $creditSale) {
            $creditSale->customer->increment('current_balance', $creditSale->amount);
        });
    }

    public function organization(): BelongsTo {
        return $this->belongsTo(Organization::class);
    }

    public function shift(): BelongsTo {
        return $this->belongsTo(Shift::class);
    }

    public function customer(): BelongsTo {
        return $this->belongsTo(Customer::class);
    }
}
