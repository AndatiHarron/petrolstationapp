<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LedgerLine extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids;

    protected $guarded = [];

    protected $casts = [
        'debit' => 'float',
        'credit' => 'float',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LedgerAccount::class, 'ledger_account_id');
    }

    /** The customer or supplier this line is against, where it has one. */
    public function party(): MorphTo
    {
        return $this->morphTo();
    }
}
