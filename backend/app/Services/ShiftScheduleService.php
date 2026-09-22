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
     * The earliest a shift may be closed.
     */
    public function earliestClose(Shift $shift): ?Carbon
    {
        if (! $shift->scheduled_end_at) {
            return null;
        }

        return Carbon::parse($shift->scheduled_end_at)
            ->subMinutes(ShiftSchedule::EARLY_CLOSE_GRACE_MINUTES);
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

        $closesAt = Carbon::parse($shift->scheduled_end_at)->setTimezone($timezone)->format('H:i');
        $opensAt = $earliest->copy()->setTimezone($timezone)->format('H:i');

        throw new ShiftReconciliationException(
            "This shift ends at {$closesAt} and can be closed from {$opensAt}. "
            .'If it has to be closed early, an administrator can do it.'
        );
    }
}
