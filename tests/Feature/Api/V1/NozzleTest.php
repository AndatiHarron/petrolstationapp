<?php

use App\Models\Nozzle;
use App\Models\Organization;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('admin can create a nozzle', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $station = Station::factory()->create(['organization_id' => $org->id]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id // Tank belongs to correct station
    ]);

    $data = [
        'name' => 'Pump 1 - Diesel',
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'digits' => 7,
        'current_reading' => 15000.50,
    ];

    postJson('/api/v1/nozzles', $data)
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Pump 1 - Diesel')
        ->assertJsonPath('data.current_reading', 15000.5);
});

test('manager cannot create a nozzle', function () {
    $org = Organization::factory()->create();
    $manager = User::factory()->create([
        'organization_id' => $org->id
    ]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $station = Station::factory()->create([
        'organization_id' => $org->id,
    ]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id // Tank belongs to correct station
    ]);

    $data = [
        'name' => 'Pump 1 - Diesel',
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'digits' => 7,
        'current_reading' => 15000.50,
    ];

    postJson('/api/v1/nozzles', $data)->assertStatus(403);
});

test('admin cannot create nozzle if tank belongs to another station', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    // Station A
    $stationA = Station::factory()->create(['organization_id' => $org->id]);

    // Station B (With a Tank)
    $stationB = Station::factory()->create(['organization_id' => $org->id]);
    $tankB = Tank::factory()->create(['station_id' => $stationB->id, 'organization_id' => $org->id]);

    // Attempt to link Station A -> Tank B
    $data = [
        'name' => 'Invalid Pump',
        'station_id' => $stationA->id,
        'tank_id' => $tankB->id, // Mismatch!
        'digits' => 7,
        'current_reading' => 0,
    ];

    postJson('/api/v1/nozzles', $data)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['tank_id']);
});

test('admin can update nozzle reading', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $nozzle = Nozzle::factory()->create([
        'organization_id' => $org->id,
        'current_reading' => 1000
    ]);

    putJson("/api/v1/nozzles/{$nozzle->id}", ['current_reading' => 1200])
        ->assertOk()
        ->assertJsonPath('data.current_reading', 1200);
});

test('admin cannot delete nozzle from another organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    $nozzleB = Nozzle::factory()->create(['organization_id' => $orgB->id]);

    // Should be 404 because of BelongsToOrganization trait
    deleteJson("/api/v1/nozzles/{$nozzleB->id}")
        ->assertNotFound();
});
