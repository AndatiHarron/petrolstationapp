<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * @method static \Illuminate\Database\Eloquent\Builder|MeterReading findOrFail($id)
 * @method static \Illuminate\Database\Eloquent\Builder|MeterReading create(array $attributes)
 */
class MeterReading extends Model
{
    use BelongsToOrganization;
    use HasFactory;
    use HasUuids;
    use LogsActivity;
    use SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'gps_coordinates' => 'array',
    ];

    /**
     * How long an evidence link stays valid.
     *
     * Long enough to open a shift and look through its photos, short enough
     * that a link copied out of a response is useless before it is much use to
     * anyone.
     */
    private const EVIDENCE_URL_TTL_MINUTES = 10;

    /**
     * Serialised alongside the reading, so the client never builds a storage
     * path of its own.
     */
    protected $appends = ['evidence_url'];

    /**
     * A short-lived signed link to this reading's photo.
     *
     * The bucket stays private: this is a presigned GET that R2 accepts for a
     * few minutes and rejects thereafter, so the credentials never leave the
     * server and an unsigned request to the object is refused. It is computed
     * here rather than in a resource because `readings` is serialised straight
     * from the model, and the endpoints that expose it are already gated by
     * ShiftPolicy — no authorization changes.
     */
    public function getEvidenceUrlAttribute(): ?string
    {
        $path = $this->attributes['evidence_path'] ?? null;

        if (! $path) {
            return null;
        }

        $disk = Storage::disk();

        try {
            return $disk->temporaryUrl($path, now()->addMinutes(self::EVIDENCE_URL_TTL_MINUTES));
        } catch (\Throwable) {
            // The local driver only signs URLs when its `serve` option is on,
            // and throws otherwise. Fall back so development keeps working
            // whichever disk is configured.
            try {
                return $disk->url($path);
            } catch (\Throwable) {
                return null;
            }
        }
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'opening_reading',
                'closing_reading',
                'volume_sold',
                'price_per_liter',
                'total_value',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Meter reading was {$eventName}");
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function nozzle(): BelongsTo
    {
        return $this->belongsTo(Nozzle::class);
    }
}
