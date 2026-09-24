<?php

namespace App\Console\Commands;

use App\Models\Shift;
use App\Models\Station;
use App\Services\ShiftScheduleService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Open a station's shift when its hours begin.
 *
 * The shifts an admin sets out are what the station actually runs, so the
 * system opens them rather than waiting to be told. A supervisor arriving to a
 * shift already open is the normal case; they take it, and the record then
 * names them.
 *
 * What it will not do is guess. It opens nothing for a station with no pattern,
 * nothing outside a scheduled window, and nothing at a station that still owes
 * readings for the shift before — that one has to be finished first, because
 * every shift opens on the reading the last one closed with.
 *
 * Starting by hand still works, and is the only way at a station with no
 * pattern set.
 */
class OpenDueShifts extends Command
{
    protected $signature = 'shifts:open-due
                            {--grace=60 : How long after its start a shift may still be opened}';

    protected $description = 'Open each station\'s scheduled shift when its hours begin';

    public function handle(ShiftScheduleService $schedules): int
    {
        // A bound on lateness, so an outage does not come back and invent a
        // shift covering hours that have already gone. Past this, the shift is
        // opened by a person or not at all.
        $grace = max(0, (int) $this->option('grace'));

        $stations = Station::query()
            ->withoutGlobalScopes()
            ->whereHas('shiftSchedules', fn ($q) => $q->where('is_active', true))
            ->get();

        $opened = 0;

        foreach ($stations as $station) {
            $blocking = Shift::withoutGlobalScopes()
                ->where('station_id', $station->id)
                ->whereIn('status', [Shift::STATUS_OPEN, Shift::STATUS_PENDING_READINGS])
                ->exists();

            if ($blocking) {
                continue;
            }

            $resolved = $schedules->resolve($station);

            if ($resolved['schedule'] === null || $resolved['starts_at'] === null) {
                continue;
            }

            $startsAt = $resolved['starts_at'];

            if ($startsAt->diffInMinutes(now(), absolute: false) > $grace) {
                continue;
            }

            // Guard against opening the same occurrence twice — a shift for
            // these exact hours may have been opened and closed already.
            $alreadyRun = Shift::withoutGlobalScopes()
                ->where('station_id', $station->id)
                ->where('shift_schedule_id', $resolved['schedule']->id)
                ->where('started_at', '>=', $startsAt)
                ->exists();

            if ($alreadyRun) {
                continue;
            }

            $shift = Shift::create([
                'station_id' => $station->id,
                'organization_id' => $station->organization_id,
                // Nobody yet. The supervisor who takes it is written in then,
                // and the shift is not attributed to a person who was not there.
                'started_by_user_id' => null,
                // Dated to the hour it was meant to begin, not to whenever this
                // command happened to run, so the hours it covers are the hours
                // agreed.
                'started_at' => $startsAt,
                'auto_started_at' => now(),
                'status' => Shift::STATUS_OPEN,
                'shift_schedule_id' => $resolved['schedule']->id,
                'scheduled_end_at' => $resolved['ends_at'],
            ]);

            $opened++;

            Log::info('Shift opened automatically', [
                'shift_id' => $shift->id,
                'shift_number' => $shift->shift_number,
                'station_id' => $station->id,
                'schedule' => $resolved['schedule']->name,
            ]);

            $this->line("Opened {$shift->shift_number} at {$station->name} — {$resolved['schedule']->name}");
        }

        $this->info($opened === 0 ? 'No shifts were due to open.' : "{$opened} shift(s) opened.");

        return self::SUCCESS;
    }
}
