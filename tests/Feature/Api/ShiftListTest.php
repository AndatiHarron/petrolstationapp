<?php

use App\Models\Shift;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

test('it can list shifts with role based restrictions', function () {
    $admin = User::where('email', 'admin@octane.com')->first();
    $manager = User::where('email', 'manager@octane.com')->first();

    // Create some shifts
    Shift::factory()->create([
        'started_by_user_id' => $manager->id,
        'station_id' => $manager->station_id,
        'organization_id' => $manager->organization_id,
        'status' => 'LOCKED',
    ]);

    Shift::factory()->create([
        'started_by_user_id' => $admin->id,
        'station_id' => $manager->station_id, // Same station
        'organization_id' => $admin->organization_id,
        'status' => 'OPEN',
    ]);

    // Test as Admin - should see all shifts in organization
    actingAs($admin);
    $response = getJson('/api/v1/shifts');
    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(2);

    // Test as Manager - should see shifts at their station
    actingAs($manager);
    $response = getJson('/api/v1/shifts');
    $response->assertStatus(200);
    // Since both shifts were created at manager's station, they should see 2
    expect($response->json('data'))->toHaveCount(2);
});

test('it can get the current shift', function () {
    $manager = User::where('email', 'manager@octane.com')->first();

    $shift = Shift::factory()->create([
        'started_by_user_id' => $manager->id,
        'station_id' => $manager->station_id,
        'organization_id' => $manager->organization_id,
        'status' => 'OPEN',
    ]);

    actingAs($manager);
    $response = getJson('/api/v1/shifts/current');

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $shift->id);
});

test('it returns 404 if no current shift exists', function () {
    $manager = User::where('email', 'manager@octane.com')->first();

    actingAs($manager);
    $response = getJson('/api/v1/shifts/current');

    $response->assertStatus(404);
});

test('unauthorized user cannot list shifts', function () {
    $user = User::factory()->create(); // No role assigned

    actingAs($user);
    $response = getJson('/api/v1/shifts');

    $response->assertStatus(403);
});

test('manager is restricted to their station', function () {
    $managerA = User::where('email', 'manager@octane.com')->first();
    $stationB = \App\Models\Station::factory()->create(['organization_id' => $managerA->organization_id]);

    // Shift at Manager A's station
    Shift::factory()->create([
        'started_by_user_id' => $managerA->id,
        'station_id' => $managerA->station_id,
        'organization_id' => $managerA->organization_id,
    ]);

    // Shift at Station B
    Shift::factory()->create([
        'station_id' => $stationB->id,
        'organization_id' => $managerA->organization_id,
    ]);

    actingAs($managerA);
    $response = getJson('/api/v1/shifts');

    $response->assertStatus(200);
    // Manager A should only see 1 shift (at their station)
    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.station_name'))->toBe($managerA->station->name);
});
