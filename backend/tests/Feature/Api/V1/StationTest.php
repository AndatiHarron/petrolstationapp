<?php

use App\Models\Organization;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('admin can list stations in their organization', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    Station::factory()->count(3)->create(['organization_id' => $org->id]);

    getJson('/api/v1/stations')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('admin cannot see stations from other organizations', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    Station::factory()->create(['organization_id' => $orgA->id]); // Should see
    Station::factory()->create(['organization_id' => $orgB->id]); // Should NOT see

    getJson('/api/v1/stations')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('admin can create a station', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $data = [
        'name' => 'Downtown Pump',
        'location' => 'Main St, Nairobi',
        'is_active' => true,
    ];

    postJson('/api/v1/stations', $data)
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Downtown Pump')
        ->assertJsonPath('data.organization_id', $admin->organization_id);
});

test('manager cannot create a station', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager'); // Policy restricts creation to Admin/Super-Admin
    Sanctum::actingAs($manager);

    $data = [
        'name' => 'Unauthorized Station',
    ];

    postJson('/api/v1/stations', $data)
        ->assertStatus(403);
});

test('admin can update a station', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $station = Station::factory()->create(['organization_id' => $org->id]);

    putJson("/api/v1/stations/{$station->id}", ['name' => 'Updated Name'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Name');
});

test('admin can delete a station', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $station = Station::factory()->create(['organization_id' => $org->id]);

    deleteJson("/api/v1/stations/{$station->id}")
        ->assertOk();

    $this->assertDatabaseMissing('stations', ['id' => $station->id]);
});

test('admin cannot access station from another organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    $stationB = Station::factory()->create(['organization_id' => $orgB->id]);

    // Expect 404 because trait scopes query before Policy runs
    getJson("/api/v1/stations/{$stationB->id}")
        ->assertNotFound();
});
