<?php

use App\Models\Shift;
use App\Models\Station;
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

test('admin can view any shift', function () {
    $admin = User::where('email', 'admin@octane.com')->first();
    $manager = User::where('email', 'manager@octane.com')->first();

    $shift = Shift::factory()->create([
        'started_by_user_id' => $manager->id,
        'station_id' => $manager->station_id,
        'organization_id' => $admin->organization_id,
    ]);

    actingAs($admin);
    $response = getJson("/api/v1/shifts/{$shift->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $shift->id)
        ->assertJsonStructure([
            'data' => [
                'id',
                'station_name',
                'started_at',
                'status',
                'variance_alert',
                'financials' => [
                    'expected',
                    'collected',
                    'variance',
                ],
                'readings',
                'dips',
                'payments',
                'credit_sales',
            ],
        ]);
});

test('manager can view shift at their station', function () {
    $manager = User::where('email', 'manager@octane.com')->first();

    $shift = Shift::factory()->create([
        'started_by_user_id' => $manager->id,
        'station_id' => $manager->station_id,
        'organization_id' => $manager->organization_id,
    ]);

    actingAs($manager);
    $response = getJson("/api/v1/shifts/{$shift->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $shift->id);
});

test('manager cannot view shift at another station', function () {
    $managerA = User::where('email', 'manager@octane.com')->first();
    $stationB = Station::factory()->create(['organization_id' => $managerA->organization_id]);

    $shiftB = Shift::factory()->create([
        'station_id' => $stationB->id,
        'organization_id' => $managerA->organization_id,
    ]);

    actingAs($managerA);
    $response = getJson("/api/v1/shifts/{$shiftB->id}");

    $response->assertStatus(403);
});

test('unauthorized user cannot view shift', function () {
    $manager = User::where('email', 'manager@octane.com')->first();
    $user = User::factory()->create(['organization_id' => $manager->organization_id]);

    $shift = Shift::factory()->create([
        'started_by_user_id' => $manager->id,
        'station_id' => $manager->station_id,
        'organization_id' => $manager->organization_id,
    ]);

    actingAs($user);
    $response = getJson("/api/v1/shifts/{$shift->id}");

    $response->assertStatus(403);
});

test('it returns 404 if shift does not exist', function () {
    $admin = User::where('email', 'admin@octane.com')->first();

    actingAs($admin);
    $response = getJson('/api/v1/shifts/non-existent-id');

    $response->assertStatus(404);
});
