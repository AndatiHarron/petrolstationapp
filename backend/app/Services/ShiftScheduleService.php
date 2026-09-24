<?php

namespace App\Services;

use App\Exceptions\ShiftReconciliationException;
use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\Station;
use App\Models\User;
use Illuminate\Support\Carbon;
use Carbon\CarbonInterface;

/**
 * Which scheduled shift is running, and whether it may be closed yet.
 */
class ShiftScheduleService
{
    /**
     * The schedule whose hours contain `$moment`, with the instant it ends.
     *
     * A station that has not set a pattern gets null for both, and everything
     * downstream treats that as "no scheduled end" rather than as an error —
     * the feature is opt-in per station, and a station mid-setup must still be
     * able to work.
     *
     * @return array{schedule: ShiftSchedule|null, ends_at: Carbon|null}
     */
    public function resolve(Station $station, ?CarbonInterface $moment = null): array
    {
        $moment ??= now();
        $timezone = $station->timezone ?: config('app.timezone', 'UTC');

        $schedules = ShiftSchedule::query()
            ->where('station_id', $station->id)
            ->where('is_active', true)
            ->orderBy('position')
            ->get();

        foreach ($schedules as $schedule) {
            $endsAt = $schedule->endFor($moment, $timezone);

            if ($endsAt !== null) {
                return ['schedule' => $schedule, 'ends_at' => $endsAt];
            }
        }

        return ['schedule' => null, 'ends_at' => null];
    }

    /**
     * When a shift is due to end.
     *
     * Normally this was settled when the shift opened. It will not have been
     * for a shift that was already running when the admin first set the
     * station's pattern — and that is every open shift on the day the feature
     * arrives, so without this the rule would appear not to work at all until
     * the next shift started.
     *
     * Resolved against the moment the shift *opened*, not the moment it is
     * being closed. A stale shift left open since the morning would otherwise
     * be judged against whichever window the evening falls in and could not be
     * closed at all.
     */
    public function scheduledEnd(Shift $shift): ?Carbon
    {
        if ($shift->scheduled_end_at) {
            return Carbon::parse($shift->scheduled_end_at);
        }

        $station = $shift->station;

        if (! $station) {
            return null;
        }

        $resolved = $this->resolve($station, Carbon::parse($shift->started_at));

        if ($resolved['ends_at'] === null) {
            return null;
        }

        // Written back, so the shift and every later reading of it agree, and
        // the work is not repeated on each request.
        $shift->forceFill([
            'shift_schedule_id' => $resolved['schedule']?->id,
            'scheduled_end_at' => $resolved['ends_at'],
        ])->saveQuietly();

        return $resolved['ends_at'];
    }

    /**
     * The earliest a shift may be closed.
     */
    public function earliestClose(Shift $shift): ?Carbon
    {
        $endsAt = $this->scheduledEnd($shift);

        if (! $endsAt) {
            return null;
        }

        return $endsAt->copy()->subMinutes(ShiftSchedule::EARLY_CLOSE_GRACE_MINUTES);
    }

    /**
     * Refuse a close that is too early.
     *
     * An early close is one of the simpler ways to take money out of a station:
     * shut the shift, keep serving, and the litres sold afterwards belong to
     * nobody. So a supervisor closes within the last ten minutes of the shift
     * or not at all.
     *
     * An admin is not held to it. They are the ones who would otherwise have to
     * unpick a genuine early closure — a power cut, a station shutting for the
     * day — and the audit log records that they were the one who did it.
     *
     * @throws ShiftReconciliationException
     */
    public function assertMayClose(Shift $shift, User $user): void
    {
        $earliest = $this->earliestClose($shift);

        if ($earliest === null || $user->hasAnyRole(['admin', 'super-admin'])) {
            return;
        }

        if (now()->greaterThanOrEqualTo($earliest)) {
            return;
        }

        $station = $shift->station;
        $timezone = $station?->timezone ?: config('app.timezone', 'UTC');

        $closesAt = $this->scheduledEnd($shift)?->setTimezone($timezone)->format('H:i') ?? '';
        $opensAt = $earliest->copy()->setTimezone($timezone)->format('H:i');

        throw new ShiftReconciliationException(
            "This shift ends at {$closesAt} and can be closed from {$opensAt}. "
            .'If it has to be closed early, an administrator can do it.'
        );
    }
}
