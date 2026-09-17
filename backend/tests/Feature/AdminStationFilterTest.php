<?php

use App\Models\EditRequest;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

/**
 * An administrator can narrow the company-wide view to a single station.
 *
 * The filter is a convenience for someone who can already see everything, so
 * the tests that matter most are the ones showing it cannot be turned into a
 * way of seeing more: a manager who sends `station_id` for a station that is
 * not theirs must still be answered with their own.
 */
beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    $this->admin = User::role('admin')->firstOrFail();
    $this->manager = User::role('manager')->firstOrFail();

    $this->stationA = Station::findOrFail($this->manager->station_id);

    $this->stationB = Station::create([
        'organization_id' => $this->admin->organization_id,
        'name' => 'Second Station',
        'location' => 'Elsewhere',
    ]);

    $this->managerB = User::create([
        'name' => 'Manager B',
        'email' => 'manager-b@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $this->admin->organization_id,
        'station_id' => $this->stationB->id,
        'email_verified_at' => now(),
    ]);
    $this->managerB->assignRole('manager');
});

function stationShift(Station $station, User $by): Shift
{
    return Shift::factory()->create([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'started_by_user_id' => $by->getKey(),
    ]);
}

/**
 * The factory carries no defaults, so every required column is named here.
 */
function editRequestBy(User $user): EditRequest
{
    return EditRequest::create([
        'organization_id' => $user->organization_id,
        'user_id' => $user->getKey(),
        'status' => 'pending',
        'model_type' => Shift::class,
        'model_id' => stationShift(Station::findOrFail($user->station_id), $user)->getKey(),
        'requested_data' => ['total_collected_cash' => 1000],
        'reason' => 'Miskeyed the cash total',
    ]);
}

// ── Shifts ───────────────────────────────────────────────────────

test('an admin sees every station until they choose one', function () {
    stationShift($this->stationA, $this->manager);
    stationShift($this->stationB, $this->managerB);

    actingAs($this->admin);

    // No parameter is the company view, unchanged from before the filter
    // existed.
    $all = getJson('/api/v1/shifts')->assertOk()->json('data');
    expect(collect($all)->pluck('station_name')->unique())->toHaveCount(2);

    $narrowed = getJson('/api/v1/shifts?station_id='.$this->stationB->id)->assertOk()->json('data');
    expect($narrowed)->toHaveCount(1)
        ->and($narrowed[0]['station_name'])->toBe($this->stationB->name);
});

test('an empty station_id is the same as not filtering', function () {
    stationShift($this->stationA, $this->manager);
    stationShift($this->stationB, $this->managerB);

    actingAs($this->admin);

    expect(getJson('/api/v1/shifts?station_id=')->assertOk()->json('data'))
        ->toHaveCount(2);
});

// ── The filter cannot widen anyone's reach ───────────────────────

test('a manager asking for another station is refused, not quietly redirected', function () {
    stationShift($this->stationA, $this->manager);
    stationShift($this->stationB, $this->managerB);

    actingAs($this->manager);

    // Answering with their own station instead would be safe but misleading:
    // the list would look like the station they asked for.
    getJson('/api/v1/shifts?station_id='.$this->stationB->id)
        ->assertStatus(422)
        ->assertJsonValidationErrors('station_id');
});

test('a manager asking for their own station is fine, and unchanged', function () {
    stationShift($this->stationA, $this->manager);
    stationShift($this->stationB, $this->managerB);

    actingAs($this->manager);

    $unfiltered = getJson('/api/v1/shifts')->assertOk()->json('data');
    $filtered = getJson('/api/v1/shifts?station_id='.$this->stationA->id)->assertOk()->json('data');

    expect($filtered)->toEqual($unfiltered)
        ->and($filtered)->toHaveCount(1);
});

test('every listing that takes the filter refuses a manager the same way', function () {
    actingAs($this->manager);

    foreach ([
        '/api/v1/shifts',
        '/api/v1/credit-sales',
        '/api/v1/audit-logs',
        '/api/v1/edit-requests',
    ] as $path) {
        getJson($path.'?station_id='.$this->stationB->id)
            ->assertStatus(422, "{$path} did not refuse a manager another station")
            ->assertJsonValidationErrors('station_id');
    }
});

test('a station belonging to another organization is refused', function () {
    $foreign = Station::factory()->create();

    actingAs($this->admin);

    // Refused rather than answered with an empty list, which would read as
    // "that station did no trading".
    getJson('/api/v1/shifts?station_id='.$foreign->id)
        ->assertStatus(422)
        ->assertJsonValidationErrors('station_id');
});

test('a station_id that is not a uuid is refused', function () {
    actingAs($this->admin);

    getJson('/api/v1/shifts?station_id=not-a-uuid')
        ->assertStatus(422)
        ->assertJsonValidationErrors('station_id');
});

// ── The other listings ───────────────────────────────────────────

test('the staff list narrows to one station', function () {
    actingAs($this->admin);

    $emails = collect(
        getJson('/api/v1/users?station_id='.$this->stationB->id)->assertOk()->json('data')
    )->pluck('email');

    expect($emails)->toContain('manager-b@example.test')
        ->and($emails)->not->toContain($this->manager->email);
});

test('edit requests narrow by the station of whoever raised them', function () {
    $mine = editRequestBy($this->manager);
    $theirs = editRequestBy($this->managerB);

    actingAs($this->admin);

    $ids = collect(
        getJson('/api/v1/edit-requests?station_id='.$this->stationB->id)->assertOk()->json('data')
    )->pluck('id');

    expect($ids)->toContain($theirs->id)
        ->and($ids)->not->toContain($mine->id);
});

test('the audit log narrows to entries caused at one station', function () {
    activity()->causedBy($this->manager)->log('did something at station A');
    activity()->causedBy($this->managerB)->log('did something at station B');

    actingAs($this->admin);

    $descriptions = collect(
        getJson('/api/v1/audit-logs?station_id='.$this->stationB->id)->assertOk()->json('data')
    )->pluck('description');

    expect($descriptions)->toContain('did something at station B')
        ->and($descriptions)->not->toContain('did something at station A');
});
