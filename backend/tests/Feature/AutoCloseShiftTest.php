<?php

use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $this->manager = User::where('email', 'manager@octane.com')->firstOrFail();
    $this->admin = User::where('email', 'admin@octane.com')->firstOrFail();
    $this->station = Station::firstOrFail();
    $this->station->update(['timezone' => 'Africa/Nairobi']);
});

/** A shift open well past a scheduled end. */
function overdueShift(): Shift
{
    $station = Station::firstOrFail();
    $manager = User::where('email', 'manager@octane.com')->firstOrFail();

    ShiftSchedule::create([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'name' => 'Morning',
        'starts_at' => '06:00',
        'ends_at' => '14:00',
        'position' => 0,
        'is_active' => true,
    ]);

    return Shift::factory()->create([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'started_by_user_id' => $manager->id,
        'status' => Shift::STATUS_OPEN,
        'started_at' => now()->setTimezone('Africa/Nairobi')->setTime(7, 0)->utc(),
        'scheduled_end_at' => null,
    ]);
}

test('a shift past its hours is closed and left awaiting its readings', function () {
    $shift = overdueShift();

    // Well past the 14:00 end, so the grace period has elapsed too.
    Carbon::setTestNow(Carbon::now()->setTimezone('Africa/Nairobi')->setTime(18, 0)->utc());

    artisan('shifts:close-due')->assertSuccessful();

    $shift->refresh();

    expect($shift->status)->toBe(Shift::STATUS_PENDING_READINGS)
        ->and($shift->auto_closed_at)->not->toBeNull()
        // Dated to when it was due to end, not when the command noticed.
        ->and($shift->locked_at->setTimezone('Africa/Nairobi')->format('H:i'))->toBe('14:00')
        // And nothing was invented.
        ->and($shift->meterReadings()->count())->toBe(0)
        ->and($shift->total_expected_cash)->toBe(0.0);

    Carbon::setTestNow();
});

test('a shift still inside its hours is left alone', function () {
    $shift = overdueShift();

    Carbon::setTestNow(Carbon::now()->setTimezone('Africa/Nairobi')->setTime(9, 0)->utc());

    artisan('shifts:close-due')->assertSuccessful();

    expect($shift->refresh()->status)->toBe(Shift::STATUS_OPEN);

    Carbon::setTestNow();
});

test('the grace period lets a late supervisor close it themselves', function () {
    $shift = overdueShift();

    // Five minutes past the end: inside the fifteen-minute grace.
    Carbon::setTestNow(Carbon::now()->setTimezone('Africa/Nairobi')->setTime(14, 5)->utc());

    artisan('shifts:close-due')->assertSuccessful();

    expect($shift->refresh()->status)->toBe(Shift::STATUS_OPEN);

    Carbon::setTestNow();
});

test('a station with no shift pattern is never auto-closed', function () {
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->manager->id,
        'status' => Shift::STATUS_OPEN,
        'started_at' => now()->subDays(2),
        'scheduled_end_at' => null,
    ]);

    artisan('shifts:close-due')->assertSuccessful();

    expect($shift->refresh()->status)->toBe(Shift::STATUS_OPEN);
});

test('a new shift cannot start while one is still owed its readings', function () {
    $shift = overdueShift();
    $shift->update(['status' => Shift::STATUS_PENDING_READINGS]);

    actingAs($this->manager);
    $response = postJson('/api/v1/shifts/start');

    $response->assertStatus(422);
    expect($response->json('error'))->toBe('shift_awaiting_readings')
        ->and($response->json('message'))->toContain('ended without its readings');
});

test('both the supervisor and an admin are shown what is waiting', function () {
    $shift = overdueShift();
    $shift->update(['status' => Shift::STATUS_PENDING_READINGS]);

    actingAs($this->manager);
    $mine = getJson('/api/v1/shifts/awaiting-readings')->assertOk();

    expect($mine->json('data'))->toHaveCount(1)
        ->and($mine->json('data.0.awaiting_readings'))->toBeTrue();

    actingAs($this->admin);
    expect(getJson('/api/v1/shifts/awaiting-readings')->assertOk()->json('data'))->toHaveCount(1);
});

test('the readings can be supplied afterwards, and reconcile as normal', function () {
    $shift = overdueShift();
    $shift->update(['status' => Shift::STATUS_PENDING_READINGS]);

    $nozzle = Nozzle::first();
    $tank = Tank::first();

    actingAs($this->manager);

    postJson("/api/v1/shifts/{$shift->id}/lock", [
        'payments' => ['cash' => 1000],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading + 20,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => $tank->current_dip_mm]],
    ])->assertOk();

    $shift->refresh();

    expect($shift->status)->toBe(Shift::STATUS_LOCKED)
        ->and($shift->meterReadings()->count())->toBe(1)
        // The chain moved on, so the next shift opens where this one ended.
        ->and((float) $nozzle->fresh()->current_reading)
        ->toBe((float) $nozzle->current_reading + 20);

    // And the station can work again.
    postJson('/api/v1/shifts/start')->assertSuccessful();
});

test('an admin can finish a shift somebody else left behind', function () {
    $shift = overdueShift();
    $shift->update(['status' => Shift::STATUS_PENDING_READINGS]);

    $nozzle = Nozzle::first();
    $tank = Tank::first();

    // Not the manager who opened it — they have gone home, which is why it was
    // closed automatically.
    actingAs($this->admin);

    postJson("/api/v1/shifts/{$shift->id}/lock", [
        'payments' => ['cash' => 0],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => $tank->current_dip_mm]],
    ])->assertOk();

    expect($shift->refresh()->status)->toBe(Shift::STATUS_LOCKED);
});
