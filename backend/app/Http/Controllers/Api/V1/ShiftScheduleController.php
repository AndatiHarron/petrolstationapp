<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShiftScheduleRequest;
use App\Http\Requests\UpdateShiftScheduleRequest;
use App\Models\ShiftSchedule;
use App\Models\Station;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * The shifts a station runs, managed per station.
 *
 * Stations do not agree on how many shifts they work or when, so this is a list
 * hanging off a station rather than a setting on the organization.
 */
class ShiftScheduleController extends Controller
{
    public function index(Request $request, Station $station)
    {
        Gate::authorize('view', $station);

        return response()->json([
            'data' => $station->shiftSchedules()->get()->map($this->present(...)),
            'meta' => [
                'station_id' => $station->id,
                'station_name' => $station->name,
                'timezone' => $station->timezone,
                // What the app shows beside the close button, so the rule is
                // stated once here rather than duplicated in the client.
                'early_close_grace_minutes' => ShiftSchedule::EARLY_CLOSE_GRACE_MINUTES,
            ],
        ]);
    }

    public function store(StoreShiftScheduleRequest $request, Station $station)
    {
        Gate::authorize('update', $station);

        $data = $request->validated();

        $schedule = $station->shiftSchedules()->create([
            'organization_id' => $station->organization_id,
            'name' => $data['name'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
            // Appended to the end unless placed explicitly, so adding a shift
            // never silently reorders the ones already there.
            'position' => $data['position'] ?? ($station->shiftSchedules()->max('position') + 1),
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $this->present($schedule)], 201);
    }

    public function update(UpdateShiftScheduleRequest $request, Station $station, ShiftSchedule $shiftSchedule)
    {
        Gate::authorize('update', $station);
        $this->assertBelongsTo($shiftSchedule, $station);

        $shiftSchedule->update($request->validated());

        return response()->json(['data' => $this->present($shiftSchedule->fresh())]);
    }

    /**
     * Retire a shift rather than delete it.
     *
     * Shifts already worked point at it, and the hours they were worked under
     * are part of their record. Deleting the row would leave those shifts
     * unable to say what they were scheduled against.
     */
    public function destroy(Station $station, ShiftSchedule $shiftSchedule)
    {
        Gate::authorize('update', $station);
        $this->assertBelongsTo($shiftSchedule, $station);

        $shiftSchedule->update(['is_active' => false]);

        return response()->json(['data' => $this->present($shiftSchedule->fresh())]);
    }

    private function assertBelongsTo(ShiftSchedule $schedule, Station $station): void
    {
        abort_unless($schedule->station_id === $station->id, 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ShiftSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'station_id' => $schedule->station_id,
            'name' => $schedule->name,
            // Trimmed to HH:MM. The seconds are always zero and only make the
            // field harder to read back into a time picker.
            'starts_at' => substr((string) $schedule->starts_at, 0, 5),
            'ends_at' => substr((string) $schedule->ends_at, 0, 5),
            'label' => $schedule->label(),
            'crosses_midnight' => $schedule->crossesMidnight(),
            'position' => $schedule->position,
            'is_active' => $schedule->is_active,
        ];
    }
}
