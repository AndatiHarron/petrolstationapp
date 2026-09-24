<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Shift extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids, LogsActivity, SoftDeletes;

    public $incrementing = false;

    public const STATUS_OPEN = 'OPEN';

    /**
     * Ended at its scheduled time with no readings taken.
     *
     * Not OPEN, because the hours it covers are over and nothing more should
     * be sold against it. Not LOCKED, because nothing has been reconciled —
     * there are no meters, no dips and no takings, and none of them may be
     * guessed. It is a shift waiting for the figures somebody still has to
     * enter.
     */
    public const STATUS_PENDING_READINGS = 'PENDING_READINGS';

    public const STATUS_LOCKED = 'LOCKED';

    public const STATUS_APPROVED = 'APPROVED';

    protected $keyType = 'string';

    protected $guarded = [];

    /**
     * Assign the human-readable reference as the shift is created, so it is never
     * missing. The UUID primary key is unchanged — this is the number people read
     * and quote, in DDMMYYYY-HHMM form (e.g. 12092026-0819).
     */
    protected static function booted(): void
    {
        static::creating(function (self $shift): void {
            if (blank($shift->shift_number)) {
                $shift->shift_number = static::nextShiftNumber(
                    $shift->started_at ? Carbon::parse($shift->started_at) : now()
                );
            }
        });
    }

    /**
     * Two stations can open a shift in the same minute, so a bare timestamp is not
     * unique. Where it is already taken, a counter is appended (…-0819-2).
     */
    public static function nextShiftNumber(?Carbon $startedAt = null): string
    {
        $base = ($startedAt ?? now())->format('dmY-Hi');

        $candidate = $base;
        $suffix = 1;

        while (static::withoutGlobalScopes()->withTrashed()->where('shift_number', $candidate)->exists()) {
            $suffix++;
            $candidate = "{$base}-{$suffix}";
        }

        return $candidate;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'status',
                'cash_variance',
                'total_collected_cash',
                'total_expected_cash',
                'stock_variance_liters',
                'started_at',
                'locked_at',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Shift was {$eventName}");
    }

    protected $casts = [
        'total_expected_cash' => 'float',
        'total_collected_cash' => 'float',
        'cash_variance' => 'float',
        'total_tax_collected' => 'float',
        'total_stock_sold_liters' => 'float',
        'stock_variance_liters' => 'float',
        'started_at' => 'datetime',
        'locked_at' => 'datetime',
        'auto_closed_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creditSales(): HasMany
    {
        return $this->hasMany(CreditSale::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /** The station's shift pattern this one was opened under, where there is one. */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ShiftSchedule::class, 'shift_schedule_id');
    }

    /** The attendant who opened the shift. */
    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by_user_id');
    }

    /** The user who closed and reconciled it, once locked. */
    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by_user_id');
    }

    public function meterReadings(): HasMany
    {
        return $this->hasMany(MeterReading::class);
    }

    public function dipReadings(): HasMany
    {
        return $this->hasMany(DipReading::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
