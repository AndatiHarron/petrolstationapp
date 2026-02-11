<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Shift extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids, LogsActivity, SoftDeletes;

    public $incrementing = false;

    public const STATUS_OPEN = 'OPEN';

    public const STATUS_LOCKED = 'LOCKED';

    public const STATUS_APPROVED = 'APPROVED';

    protected $keyType = 'string';

    protected $guarded = [];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'status',
                'cash_variance',
                'total_collected_cash',
                'stock_variance_liters',
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
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creditSales(): HasMany
    {
        return $this->hasMany(CreditSale::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
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
