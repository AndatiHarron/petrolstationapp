<?php

namespace App\Console\Commands;

use App\Models\Shift;
use App\Services\ShiftScheduleService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * End shifts that have reached their scheduled close with nobody there.
 *
 * A supervisor who goes home without closing leaves the shift open for ever:
 * the station cannot start the next one, and the record never says when the
 * hours it covers actually ended. Closing it on time fixes both.
 *
 * What it deliberately does not do is invent anything. No meters, no dips, no
 * takings — none of those can be known from here, and a reconciliation built on
 * assumed figures would be worse than none at all, because it would look
 * finished. The shift is closed as PENDING_READINGS and someone is asked for
 * the numbers.
 */
class CloseDueShifts extends Command
{
    protected $signature = 'shifts:close-due
                            {--grace=15 : Minutes past the scheduled end before stepping in}';

    protected $description = 'End shifts whose scheduled hours are over, leaving them awaiting readings';

    public function handle(ShiftScheduleService $schedules): int
    {
        // Enough of a margin that a supervisor closing properly, a minute or
        // two late, is never beaten to it by this. The whole value of a shift
        // is the readings a person takes at the pump, so the system waits.
        $grace = max(0, (int) $this->option('grace'));
        $cutoff = now()->subMinutes($grace);

        $shifts = Shift::query()
            ->withoutGlobalScopes()
            ->where('status', Shift::STATUS_OPEN)
            ->with('station')
            ->get()
            ->filter(function (Shift $shift) use ($schedules, $cutoff): bool {
                $endsAt = $schedules->scheduledEnd($shift);

                // A station with no shift pattern has no scheduled end, so
                // there is nothing here to act on — its shifts stay open until
                // somebody closes them, exactly as before.
                return $endsAt !== null && $endsAt->lessThanOrEqualTo($cutoff);
            });

        foreach ($shifts as $shift) {
            $shift->forceFill([
                'status' => Shift::STATUS_PENDING_READINGS,
                // Dated to when the shift was due to end, not to when this
                // command happened to notice. The hours it covers are the
                // scheduled hours.
                'locked_at' => $schedules->scheduledEnd($shift),
                'auto_closed_at' => now(),
            ])->save();

            Log::info('Shift closed automatically, awaiting readings', [
                'shift_id' => $shift->id,
                'shift_number' => $shift->shift_number,
                'station_id' => $shift->station_id,
            ]);

            $this->line("Closed {$shift->shift_number} — awaiting readings");
        }

        $this->info($shifts->isEmpty() ? 'No shifts were due.' : "{$shifts->count()} shift(s) closed.");

        return self::SUCCESS;
    }
}
