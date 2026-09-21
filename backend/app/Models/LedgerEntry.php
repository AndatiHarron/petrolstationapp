<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One balanced journal entry: the ledger's unit of record.
 *
 * There is no update path and no delete path on purpose. A wrong entry is
 * corrected by posting its mirror image and then posting the right one, which
 * is what keeps the history readable — the same rule the shift audit trail
 * already follows.
 */
class LedgerEntry extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids;

    protected $guarded = [];

    public const TYPE_SHIFT_SALE = 'SHIFT_SALE';

    public const TYPE_LIFTING = 'LIFTING';

    public const TYPE_CREDIT_SETTLEMENT = 'CREDIT_SETTLEMENT';

    public const TYPE_SUPPLIER_SETTLEMENT = 'SUPPLIER_SETTLEMENT';

    public const TYPE_REVERSAL = 'REVERSAL';

    public const TYPE_ADJUSTMENT = 'ADJUSTMENT';

    protected $casts = [
        'entry_date' => 'date',
        'total_debit' => 'float',
        'total_credit' => 'float',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(LedgerLine::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function reverses(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reverses_entry_id');
    }

    public function reversal(): HasMany
    {
        return $this->hasMany(self::class, 'reverses_entry_id');
    }

    public function isBalanced(): bool
    {
        return abs($this->total_debit - $this->total_credit) < 0.005;
    }
}
