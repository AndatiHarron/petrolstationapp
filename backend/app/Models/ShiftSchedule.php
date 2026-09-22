<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Carbon\CarbonInterface;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * One of the shifts a station runs, as a pattern rather than an occurrence.
 *
 * "Morning, 06:00 to 14:00" is a schedule; the morning worked on the 14th is a
 * Shift. The times are wall-clock at the station, and an end earlier than its
 * start means the shift runs through midnight.
 */
class ShiftSchedule extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    /**
     * How long before the scheduled end a shift may be closed.
     *
     * Not zero, because a supervisor cannot be expected to close at the exact
     * second and the relief is usually already there. Not an hour, because the
     * whole point of scheduling shifts is that the hours worked are the hours
     * agreed — an early close is how takings walk out of a station, and
     * everything before this window needs an admin to sanction it.
     */
    public const EARLY_CLOSE_GRACE_MINUTES = 10;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'starts_at', 'ends_at', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Shift schedule was {$eventName}");
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /** Whether this shift runs through midnight. */
    public function crossesMidnight(): bool
    {
        return $this->ends_at <= $this->starts_at;
    }

    /**
     * When the shift containing `$moment` would end, as a real instant.
     *
     * Returns null when `$moment` falls outside this schedule's hours.
     *
     * The awkward case is the night shift. "22:00 to 06:00" describes a window
     * that belongs to two calendar days at once, so both readings are tried:
     * the one that started yesterday evening, and the one starting tonight.
     */
    public function endFor(CarbonInterface $moment, string $timezone): ?Carbon
    {
        $local = Carbon::parse($moment)->setTimezone($timezone);

        foreach ($this->windowsAround($local) as [$start, $end]) {
            // Half-open: a moment exactly on the end belongs to the next shift,
            // or a handover at 14:00 would match both.
            if ($local->greaterThanOrEqualTo($start) && $local->lessThan($end)) {
                return $end->copy()->utc();
            }
        }

        return null;
    }

    /**
     * The candidate windows this schedule could mean around a given local time.
     *
     * @return list<array{0: Carbon, 1: Carbon}>
     */
    private function windowsAround(Carbon $local): array
    {
        $applyTime = function (Carbon $day, string $time): Carbon {
            [$hour, $minute, $second] = array_pad(explode(':', $time), 3, '0');

            return $day->copy()->setTime((int) $hour, (int) $minute, (int) $second);
        };

        $starts = (string) $this->starts_at;
        $ends = (string) $this->ends_at;

        if (! $this->crossesMidnight()) {
            return [[$applyTime($local, $starts), $applyTime($local, $ends)]];
        }

        // Through midnight: the window that opened yesterday and the one
        // opening today, since `$local` may sit on either side of the boundary.
        return [
            [$applyTime($local->copy()->subDay(), $starts), $applyTime($local, $ends)],
            [$applyTime($local, $starts), $applyTime($local->copy()->addDay(), $ends)],
        ];
    }

    /** "06:00 – 14:00", for anything a person reads. */
    public function label(): string
    {
        return substr((string) $this->starts_at, 0, 5).' – '.substr((string) $this->ends_at, 0, 5);
    }
}
