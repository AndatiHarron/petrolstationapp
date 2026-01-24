<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Shift extends Model
{
    use LogsActivity;
    use BelongsToOrganization;
    use HasUuids;
    public $incrementing = false;
    public const STATUS_OPEN = "OPEN";
    public const STATUS_LOCKED = "LOCKED";
    public const STATUS_APPROVED = "APPROVED";

    protected $keyType = 'string';
    protected $guarded = [];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'status',
                'cash_variance',
                'total_collected_cash',
                'stock_variance_liters'
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Shift was {$eventName}");
    }

    protected $casts = [
        'started_at' => 'datetime',
        'locked_at' => 'datetime',
        'cash_variance' => 'decimal:2'
    ];

    public function organization(): BelongsTo {
        return $this->belongsTo(Organization::class);
    }

    public function creditSales(): HasMany {
        return $this->hasMany(CreditSale::class);
    }

    public function station(): BelongsTo {
        return $this->belongsTo(Station::class);
    }

    public function meterReadings(): HasMany {
        return $this->hasMany(MeterReading::class);
    }

    public function dipReadings(): HasMany {
        return $this->hasMany(DipReading::class);
    }

    public function payments() : HasMany {
        return $this->hasMany(Payment::class);
    }
}
