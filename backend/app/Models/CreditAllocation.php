<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A slice of one settlement applied to one credit sale.
 */
class CreditAllocation extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids;

    protected $guarded = [];

    protected $casts = [
        'amount' => 'float',
    ];

    public function creditSale(): BelongsTo
    {
        return $this->belongsTo(CreditSale::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(CreditSettlement::class, 'credit_settlement_id');
    }
}
