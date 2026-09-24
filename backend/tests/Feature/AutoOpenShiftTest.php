<?php

use App\Exceptions\ShiftReconciliationException;
use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\Station;
use App\Models\User;
use App\Services\ShiftScheduleService;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    $this->station = Station::firstOrFail();
    $this->station->update(['timezone' => 'Africa/Nairobi']);

    $this->supervisor = User::where('email', 'manager@octane.com')->firstOrFail();

    // DevSeeder may leave a shift open; these tests are about what happens when
    // a station has none.
    Shift::withoutGlobalScopes()->delete();
});

afterEach(function () {
    Carbon::setTestNow();
});

function autoOpenSchedule(array $attributes = []): ShiftSchedule
{
    $station = Station::firstOrFail();

    return ShiftSchedule::create(array_merge([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'name' => 'Morning',
        'starts_at' => '06:00',
        'ends_at' => '14:00',
        'position' => 0,
        'is_active' => true,
    ], $attributes));
}

function atNairobi(string $time): void
{
    Carbon::setTestNow(Carbon::parse($time, 'Africa/Nairobi')->utc());
}

/**
 * The shifts an admin sets out are the shifts the station runs. Nobody should
 * have to tell the system that the morning has begun.
 */
it('opens the scheduled shift when its hours begin', function () {
    $schedule = autoOpenSchedule();

    atNairobi('2026-09-24 06:05:00');

    artisan('shifts:open-due')->assertSuccessful();

    $shift = Shift::withoutGlobalScopes()->firstOrFail();

    expect($shift->status)->toBe(Shift::STATUS_OPEN)
        ->and($shift->shift_schedule_id)->toBe($schedule->id)
        ->and($shift->started_by_user_id)->toBeNull()
        ->and($shift->auto_started_at)->not->toBeNull();

    // Dated to the hour it was meant to begin, not to when the command ran.
    expect($shift->started_at->equalTo(Carbon::parse('2026-09-24 06:00:00', 'Africa/Nairobi')))
        ->toBeTrue();
});

it('opens nothing for a station with no pattern', function () {
    atNairobi('2026-09-24 06:05:00');

    artisan('shifts:open-due')->assertSuccessful();

    expect(Shift::withoutGlobalScopes()->count())->toBe(0);
});

it('opens nothing outside the scheduled hours', function () {
    autoOpenSchedule();

    atNairobi('2026-09-24 03:00:00');

    artisan('shifts:open-due')->assertSuccessful();

    expect(Shift::withoutGlobalScopes()->count())->toBe(0);
});

/**
 * An outage must not come back and invent a shift covering hours already gone.
 */
it('will not open a shift hours after it should have begun', function () {
    autoOpenSchedule();

    // Half past ten — four and a half hours into an eight hour shift.
    atNairobi('2026-09-24 10:30:00');

    artisan('shifts:open-due')->assertSuccessful();

    expect(Shift::withoutGlobalScopes()->count())->toBe(0);
});

it('does not open a second shift while one is running', function () {
    autoOpenSchedule();

    atNairobi('2026-09-24 06:05:00');
    artisan('shifts:open-due')->assertSuccessful();

    atNairobi('2026-09-24 06:20:00');
    artisan('shifts:open-due')->assertSuccessful();

    expect(Shift::withoutGlobalScopes()->count())->toBe(1);
});

/**
 * A station owing readings is stuck until they are in — the same rule that
 * stops a person starting one, for the same reason.
 */
it('does not open a shift at a station that still owes readings', function () {
    autoOpenSchedule();

    Shift::create([
        'station_id' => $this->station->id,
        'organization_id' => $this->station->organization_id,
        'started_by_user_id' => $this->supervisor->id,
        'started_at' => now()->subDay(),
        'status' => Shift::STATUS_PENDING_READINGS,
    ]);

    atNairobi('2026-09-24 06:05:00');

    artisan('shifts:open-due')->assertSuccessful();

    expect(Shift::withoutGlobalScopes()->where('status', Shift::STATUS_OPEN)->count())->toBe(0);
});

/**
 * The supervisor arrives to a shift already running and takes it. The record
 * has to end up naming them, or a shift full of readings answers to nobody.
 */
it('gives the running shift to the supervisor who asks for it', function () {
    autoOpenSchedule();

    atNairobi('2026-09-24 06:05:00');
    artisan('shifts:open-due')->assertSuccessful();

    actingAs($this->supervisor);

    $shift = Shift::withoutGlobalScopes()->firstOrFail();

    getJson('/api/v1/shifts/current')
        ->assertOk()
        ->assertJsonPath('data.id', $shift->id);

    expect($shift->fresh()->started_by_user_id)->toBe($this->supervisor->id);
});

it('takes the running shift rather than opening a second one', function () {
    autoOpenSchedule();

    atNairobi('2026-09-24 06:05:00');
    artisan('shifts:open-due')->assertSuccessful();

    actingAs($this->supervisor);
    postJson('/api/v1/shifts/start')->assertSuccessful();

    expect(Shift::withoutGlobalScopes()->count())->toBe(1)
        ->and(Shift::withoutGlobalScopes()->firstOrFail()->started_by_user_id)
        ->toBe($this->supervisor->id);
});

/**
 * Starting by hand is still there — and is the only way at a station whose
 * pattern has not been set up.
 */
it('still lets a supervisor start a shift by hand', function () {
    actingAs($this->supervisor);

    postJson('/api/v1/shifts/start')->assertSuccessful();

    $shift = Shift::withoutGlobalScopes()->firstOrFail();

    expect($shift->started_by_user_id)->toBe($this->supervisor->id)
        ->and($shift->auto_started_at)->toBeNull();
});

/**
 * The ten minute rule is the point of scheduling shifts at all, and it has to
 * keep holding for a shift the system opened just as it did for a manual one.
 */
it('still refuses to close an automatically opened shift too early', function () {
    autoOpenSchedule();

    atNairobi('2026-09-24 06:05:00');
    artisan('shifts:open-due')->assertSuccessful();

    $shift = Shift::withoutGlobalScopes()->firstOrFail();
    $service = app(ShiftScheduleService::class);

    // 13:45 — fifteen minutes out, which is still five minutes too early.
    atNairobi('2026-09-24 13:45:00');

    expect(fn () => $service->assertMayClose($shift->fresh(), $this->supervisor))
        ->toThrow(ShiftReconciliationException::class);

    // 13:51 — inside the last ten minutes, so it is allowed.
    atNairobi('2026-09-24 13:51:00');

    $service->assertMayClose($shift->fresh(), $this->supervisor);
});
