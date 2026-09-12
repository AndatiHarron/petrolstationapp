<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Invoice extends Model
{
    /** @use HasFactory<\Database\Factories\InvoiceFactory> */
    use BelongsToOrganization, HasFactory, HasUuids, SoftDeletes;

    protected $guarded = [];

    /**
     * Next invoice number for a given day, in DDMMYYYY-NNN form
     * (e.g. 12092026-001). The sequence restarts each day.
     *
     * The `invoice_number` column is uniquely indexed, so a duplicate would be
     * rejected by the database rather than silently written. The loop below walks
     * past any number already taken, which also covers the case of two invoices
     * being generated concurrently.
     */
    public static function nextInvoiceNumber(?Carbon $date = null): string
    {
        $prefix = ($date ?? now())->format('dmY');

        $highest = static::withoutGlobalScopes()
            ->withTrashed()
            ->where('invoice_number', 'like', "{$prefix}-%")
            ->max('invoice_number');

        $sequence = $highest === null
            ? 1
            : ((int) Str::afterLast($highest, '-')) + 1;

        do {
            $candidate = sprintf('%s-%03d', $prefix, $sequence);
            $sequence++;
        } while (
            static::withoutGlobalScopes()
                ->withTrashed()
                ->where('invoice_number', $candidate)
                ->exists()
        );

        return $candidate;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
