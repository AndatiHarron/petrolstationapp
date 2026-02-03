<?php

use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;
use function Pest\Laravel\getJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
   seed(RolesAndPermissionsSeeder::class);
});

test('super admin can see audit logs from all organizations', function () {
    // 1. Setup Data
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $userA = User::factory()->create(['organization_id' => $orgA->id]);
    $userB = User::factory()->create(['organization_id' => $orgB->id]);

    // 2. Generate Logs
    activity()->performedOn($userA)->causedBy($userA)->log('User A updated profile');
    activity()->performedOn($userB)->causedBy($userB)->log('User B updated profile');

    // 3. Act as Super Admin
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    // 4. Assert
    getJson('/api/v1/audit-logs')
        ->assertOk()
        ->assertJsonCount(2, 'data'); // Sees both
});

test('station manager sees logs scoped to their station', function () {
    $org = Organization::factory()->create();

    // Create Two Stations in the SAME Org
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    // Create Managers
    $managerA = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $managerA->assignRole('manager');

    $managerB = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id]);

    // 1. Log by Manager A (Should be seen)
    activity()->causedBy($managerA)->log('Manager A login');

    // 2. Log by Manager B (Should NOT be seen by Manager A)
    activity()->causedBy($managerB)->log('Manager B login');

    Sanctum::actingAs($managerA);

    getJson('/api/v1/audit-logs')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.description', 'Manager A login');
});

test('station manager sees logs performed by super admin ON their objects', function () {
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);

    // Manager for the station
    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $manager->assignRole('manager');

    // Super Admin (External user, different/no Org)
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    // Create a Shift belonging to the Manager's Station
    $shift = Shift::create([
        'station_id' => $station->id,
        'started_by_user_id' => $manager->id,
        'status' => 'OPEN',
        'started_at' => now(),
        'organization_id' => $org->id,
    ]);

    // CLEANUP: Wipe the logs so we start fresh for the assertion
    Activity::truncate();

    // Super Admin forces the shift to close (Causer != Manager's Org)
    // But Subject (Shift) == Manager's Station
    activity()
        ->performedOn($shift)
        ->causedBy($superAdmin)
        ->log('Force closed shift');

    Sanctum::actingAs($manager);

    getJson('/api/v1/audit-logs')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.description', 'Force closed shift')
        ->assertJsonPath('data.0.subject.type', 'Shift');
});

test('audit log response structure is correct', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');
    Sanctum::actingAs($user);

    activity()
        ->performedOn($user)
        ->causedBy($user)
        ->withProperties(['attributes' => ['name' => 'New Name'], 'old' => ['name' => 'Old Name']])
        ->log('updated');

    getJson('/api/v1/audit-logs')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'description',
                    'time_ago',
                    'timestamp',
                    'causer' => ['id', 'name', 'role'],
                    'subject' => ['type', 'id'],
                    'changes' => ['old', 'new']
                ]
            ],
            'links',
            'meta'
        ])
        ->assertJsonPath('data.0.changes.new.name', 'New Name');
});
