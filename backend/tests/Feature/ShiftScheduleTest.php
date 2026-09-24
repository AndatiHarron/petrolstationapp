<?php

use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\Nozzle;
use App\Models\Station;
use App\Models\Tank;
use App\Models\SupportRequest;
use App\Models\User;
use App\Mail\SupportRequested;
use App\Services\ShiftScheduleService;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\getJson;
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

/** A lock payload the request validator will actually accept. */
function closingPayload(): array
{
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    return [
        'payments' => ['cash' => 0],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => $tank->current_dip_mm]],
    ];
}

function makeSchedule(array $attributes = []): ShiftSchedule
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

// ── Admin sets the pattern ────────────────────────────────────────────

test('an admin can give a station several shifts', function () {
    actingAs($this->admin);

    foreach ([['Morning', '06:00', '14:00'], ['Afternoon', '14:00', '22:00'], ['Night', '22:00', '06:00']] as [$name, $from, $to]) {
        postJson("/api/v1/stations/{$this->station->id}/shift-schedules", [
            'name' => $name,
            'starts_at' => $from,
            'ends_at' => $to,
        ])->assertCreated();
    }

    $listed = getJson("/api/v1/stations/{$this->station->id}/shift-schedules")->assertOk();

    expect($listed->json('data'))->toHaveCount(3)
        ->and($listed->json('data.2.crosses_midnight'))->toBeTrue()
        ->and($listed->json('meta.early_close_grace_minutes'))->toBe(10);
});

test('stations keep their own patterns, so two may both have a Morning', function () {
    actingAs($this->admin);

    $other = Station::factory()->create(['organization_id' => $this->station->organization_id]);

    postJson("/api/v1/stations/{$this->station->id}/shift-schedules", [
        'name' => 'Morning', 'starts_at' => '06:00', 'ends_at' => '14:00',
    ])->assertCreated();

    postJson("/api/v1/stations/{$other->id}/shift-schedules", [
        'name' => 'Morning', 'starts_at' => '05:00', 'ends_at' => '13:00',
    ])->assertCreated();
});

test('the same station cannot have two shifts of one name', function () {
    actingAs($this->admin);

    $payload = ['name' => 'Morning', 'starts_at' => '06:00', 'ends_at' => '14:00'];

    postJson("/api/v1/stations/{$this->station->id}/shift-schedules", $payload)->assertCreated();
    postJson("/api/v1/stations/{$this->station->id}/shift-schedules", $payload)->assertStatus(422);
});

test('a supervisor cannot change the pattern', function () {
    actingAs($this->manager);

    postJson("/api/v1/stations/{$this->station->id}/shift-schedules", [
        'name' => 'Morning', 'starts_at' => '06:00', 'ends_at' => '14:00',
    ])->assertForbidden();
});

// ── Resolving which shift is running ──────────────────────────────────

test('a shift opened inside a window takes that window as its end', function () {
    makeSchedule(['name' => 'Morning', 'starts_at' => '06:00', 'ends_at' => '14:00']);

    // 09:00 in Nairobi.
    Carbon::setTestNow(Carbon::parse('2026-09-22 06:00:00', 'UTC'));

    $resolved = app(ShiftScheduleService::class)->resolve($this->station->fresh());

    expect($resolved['schedule']->name)->toBe('Morning')
        ->and($resolved['ends_at']->setTimezone('Africa/Nairobi')->format('H:i'))->toBe('14:00');

    Carbon::setTestNow();
});

test('a night shift running past midnight ends the next morning', function () {
    makeSchedule(['name' => 'Night', 'starts_at' => '22:00', 'ends_at' => '06:00']);

    // 01:00 in Nairobi on the 23rd — inside a shift that began at 22:00 on the
    // 22nd. The naive reading would place it outside every window.
    Carbon::setTestNow(Carbon::parse('2026-09-22 22:00:00', 'UTC'));

    $resolved = app(ShiftScheduleService::class)->resolve($this->station->fresh());

    expect($resolved['schedule']->name)->toBe('Night')
        ->and($resolved['ends_at']->setTimezone('Africa/Nairobi')->format('Y-m-d H:i'))
        ->toBe('2026-09-23 06:00');

    Carbon::setTestNow();
});

test('a station with no pattern simply has no scheduled end', function () {
    $resolved = app(ShiftScheduleService::class)->resolve($this->station->fresh());

    expect($resolved['schedule'])->toBeNull()
        ->and($resolved['ends_at'])->toBeNull();
});

// ── The early-close rule ──────────────────────────────────────────────

test('a supervisor cannot close a shift that is not nearly over', function () {
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->manager->id,
        'status' => 'OPEN',
        'scheduled_end_at' => now()->addHours(3),
    ]);

    actingAs($this->manager);

    $response = postJson("/api/v1/shifts/{$shift->id}/lock", closingPayload());

    $response->assertStatus(422);
    expect($response->json('error'))->toBe('shift_not_due')
        ->and($response->json('message'))->toContain('can be closed from');
});

test('a supervisor may close inside the last ten minutes', function () {
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->manager->id,
        'status' => 'OPEN',
        'scheduled_end_at' => now()->addMinutes(9),
    ]);

    actingAs($this->manager);

    postJson("/api/v1/shifts/{$shift->id}/lock", closingPayload())->assertOk();
});

test('an admin may close early, because somebody has to be able to', function () {
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->admin->id,
        'status' => 'OPEN',
        'scheduled_end_at' => now()->addHours(4),
    ]);

    actingAs($this->admin);

    postJson("/api/v1/shifts/{$shift->id}/lock", closingPayload())->assertOk();
});

test('a shift with no scheduled end can be closed whenever', function () {
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->manager->id,
        'status' => 'OPEN',
        'scheduled_end_at' => null,
    ]);

    actingAs($this->manager);

    postJson("/api/v1/shifts/{$shift->id}/lock", closingPayload())->assertOk();
});

test('the rule reaches a shift that was already open when the pattern was set', function () {
    // Every open shift on the day this feature arrives looks like this: no
    // scheduled end, because there was no pattern when it started. Without
    // resolving one at close time the rule would appear not to work at all.
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->manager->id,
        'status' => 'OPEN',
        'started_at' => now()->setTimezone('Africa/Nairobi')->setTime(7, 0)->utc(),
        'scheduled_end_at' => null,
    ]);

    makeSchedule(['name' => 'Morning', 'starts_at' => '06:00', 'ends_at' => '14:00']);

    // Now is 08:00 in Nairobi — well inside a shift that ends at 14:00.
    Carbon::setTestNow(Carbon::now()->setTimezone('Africa/Nairobi')->setTime(8, 0)->utc());

    actingAs($this->manager);
    $response = postJson("/api/v1/shifts/{$shift->id}/lock", closingPayload());

    $response->assertStatus(422);
    expect($response->json('error'))->toBe('shift_not_due');

    // And the resolved end is written back, so it is settled from here on.
    expect($shift->fresh()->scheduled_end_at)->not->toBeNull();

    Carbon::setTestNow();
});

test('a stale shift left open all day can still be closed', function () {
    // Resolved against when it opened, not when it is being closed — or a
    // shift forgotten since the morning would be judged against the evening
    // window and could never be closed at all.
    $shift = Shift::factory()->create([
        'organization_id' => $this->station->organization_id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->manager->id,
        'status' => 'OPEN',
        'started_at' => now()->setTimezone('Africa/Nairobi')->setTime(7, 0)->utc(),
        'scheduled_end_at' => null,
    ]);

    makeSchedule(['name' => 'Morning', 'starts_at' => '06:00', 'ends_at' => '14:00']);
    makeSchedule(['name' => 'Evening', 'starts_at' => '14:00', 'ends_at' => '22:00', 'position' => 1]);

    // 20:00 — long past the morning shift it belongs to.
    Carbon::setTestNow(Carbon::now()->setTimezone('Africa/Nairobi')->setTime(20, 0)->utc());

    actingAs($this->manager);
    postJson("/api/v1/shifts/{$shift->id}/lock", closingPayload())->assertOk();

    Carbon::setTestNow();
});

test('the app is told which shift is being worked', function () {
    makeSchedule(['name' => 'Morning', 'starts_at' => '00:00', 'ends_at' => '23:59']);

    actingAs($this->manager);
    $started = postJson('/api/v1/shifts/start')->assertSuccessful();

    expect($started->json('data.schedule_name'))->toBe('Morning')
        ->and($started->json('data.scheduled_end_at'))->not->toBeNull();
});

// ── Asking for help from the sign-in screen ───────────────────────────

test('anyone stuck at sign-in can ask for help, and the owners are told', function () {
    Mail::fake();

    // The dev seed has no platform owner, and without one there is nobody to
    // tell — which is a real state worth handling, but not the one under test.
    User::factory()->create(['email' => 'owner@ginto.test'])->assignRole('super-admin');

    postJson('/api/v1/support-requests', [
        'email' => 'manager@octane.com',
        'message' => 'My password stopped working this morning.',
    ])->assertStatus(202);

    Mail::assertSent(SupportRequested::class);

    expect(SupportRequest::count())->toBe(1)
        ->and(SupportRequest::first()->user_id)->toBe($this->manager->id);
});

test('an unknown address is accepted and recorded the same way', function () {
    Mail::fake();

    // The answer must not differ, or this becomes a way of testing which
    // addresses have accounts.
    postJson('/api/v1/support-requests', ['email' => 'nobody@example.com'])
        ->assertStatus(202);

    expect(SupportRequest::first()->user_id)->toBeNull();
});

test('the request is kept even when the mail cannot be sent', function () {
    Mail::shouldReceive('to')->andThrow(new RuntimeException('SMTP is down'));

    postJson('/api/v1/support-requests', ['email' => 'manager@octane.com'])
        ->assertStatus(202);

    expect(SupportRequest::count())->toBe(1)
        ->and(SupportRequest::first()->notified)->toBeFalse();
});

test('a malformed address is refused', function () {
    postJson('/api/v1/support-requests', ['email' => 'not-an-address'])
        ->assertStatus(422);
});
