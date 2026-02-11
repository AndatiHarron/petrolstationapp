<?php

use App\Models\Lifting;
use App\Models\Organization;
use App\Models\Station;
use App\Models\Tank;
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

test('creating a lifting increases tank volume', function () {
    // 1. Setup
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);

    // Create a Tank with 1,000 Liters
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
        'current_volume' => 1000,
        'capacity_liters' => 20000,
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    // 2. Act: Add 5,000 Liters
    $data = [
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->format('Y-m-d'),
        'invoice_number' => 'INV-123',
        'volume_liters' => 5000,
        'buying_price_per_liter' => 100,
        'total_cost' => 500000,
    ];

    postJson('/api/v1/liftings', $data)->assertStatus(201);

    // 3. Assert: Tank should now be 6,000 Liters (1000 + 5000)
    expect($tank->refresh()->current_volume)->toEqual(6000);
});

test('deleting a lifting decreases tank volume', function () {
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
        'current_volume' => 1000,
    ]);

    // Create an existing lifting of 5,000 Liters
    $lifting = Lifting::factory()->create([
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'volume_liters' => 5000,
        'organization_id' => $org->id,
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id]);
    $manager->assignRole('admin'); // Admins can delete anytime
    Sanctum::actingAs($manager);

    // Act: Delete the lifting
    deleteJson("/api/v1/liftings/{$lifting->id}")->assertOk();

    // Assert: Tank volume should drop back to 1,000 (6000 - 5000)
    expect($tank->refresh()->current_volume)->toEqual(1000.0);
});

test('manager cannot record lifting for a different station tank', function () {
    $org = Organization::factory()->create();

    // Station A (Manager's Station)
    $stationA = Station::factory()->create(['organization_id' => $org->id]);

    // Station B (Another Station)
    $stationB = Station::factory()->create(['organization_id' => $org->id]);
    $tankB = Tank::factory()->create(['station_id' => $stationB->id]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    // Act: Try to add fuel to Station B's tank
    $data = [
        'station_id' => $stationB->id, // Validation should catch this mismatch first
        'tank_id' => $tankB->id,
        'lifting_date' => now()->format('Y-m-d'),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 100000,
    ];

    postJson('/api/v1/liftings', $data)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['station_id']);
});

test('manager cannot delete old liftings', function () {
    $org = Organization::factory()->create();
    $lifting = Lifting::factory()->create([
        'organization_id' => $org->id,
        'created_at' => now()->subHours(25), // 25 hours old
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    deleteJson("/api/v1/liftings/{$lifting->id}")
        ->assertStatus(403);
});

test('admin can delete old liftings', function () {
    $org = Organization::factory()->create();
    $lifting = Lifting::factory()->create([
        'organization_id' => $org->id,
        'created_at' => now()->subHours(48),
    ]);

    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    deleteJson("/api/v1/liftings/{$lifting->id}")
        ->assertOk();
});

test('lifting date cannot be in the future', function () {
    $user = User::factory()->create();
    $user->assignRole('admin');
    Sanctum::actingAs($user);

    $data = Lifting::factory()->make([
        'lifting_date' => now()->addDay()->format('Y-m-d'),
    ])->toArray();

    postJson('/api/v1/liftings', $data)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['lifting_date']);
});

test('creating a lifting stores and returns supplier_name', function () {
    // Setup
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $data = [
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->format('Y-m-d'),
        'invoice_number' => 'INV-555',
        'supplier_name' => 'Acme Fuels Ltd',
        'volume_liters' => 2000,
        'buying_price_per_liter' => 120,
        'total_cost' => 240000,
    ];

    $response = postJson('/api/v1/liftings', $data)->assertStatus(201);

    $response->assertJsonPath('data.supplier_name', 'Acme Fuels Ltd');
});

test('updating supplier_name on a lifting works (admin)', function () {
    $org = Organization::factory()->create();
    $lifting = Lifting::factory()->create([
        'organization_id' => $org->id,
        'supplier_name' => 'Old Supplier',
    ]);

    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    putJson("/api/v1/liftings/{$lifting->id}", [
        'supplier_name' => 'New Supplier Name',
    ])->assertOk()
        ->assertJsonPath('data.supplier_name', 'New Supplier Name');
});

test('supplier_name must be a string up to 255 chars if provided', function () {
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    // Invalid: too long
    $tooLong = str_repeat('a', 256);

    postJson('/api/v1/liftings', [
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->format('Y-m-d'),
        'invoice_number' => 'INV-777',
        'supplier_name' => $tooLong,
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 100000,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['supplier_name']);
});

test('manager can only see their own station liftings in index', function () {
    $org = Organization::factory()->create();
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    Lifting::factory()->create(['station_id' => $stationA->id, 'organization_id' => $org->id]);
    Lifting::factory()->create(['station_id' => $stationB->id, 'organization_id' => $org->id]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $response = getJson('/api/v1/liftings')->assertOk();

    // Should only see 1 record (from station A)
    $response->assertJsonCount(1, 'data');
});

test('manager cannot view lifting from another station', function () {
    $org = Organization::factory()->create();
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    $liftingB = Lifting::factory()->create(['station_id' => $stationB->id, 'organization_id' => $org->id]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    getJson("/api/v1/liftings/{$liftingB->id}")->assertStatus(403);
});

test('manager cannot update lifting from another station', function () {
    $org = Organization::factory()->create();
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    $liftingB = Lifting::factory()->create([
        'station_id' => $stationB->id,
        'organization_id' => $org->id,
        'created_at' => now(),
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    putJson("/api/v1/liftings/{$liftingB->id}", [
        'supplier_name' => 'Should fail',
    ])->assertStatus(403);
});

test('manager cannot delete lifting from another station', function () {
    $org = Organization::factory()->create();
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    $liftingB = Lifting::factory()->create([
        'station_id' => $stationB->id,
        'organization_id' => $org->id,
        'created_at' => now(),
    ]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    deleteJson("/api/v1/liftings/{$liftingB->id}")->assertStatus(403);
});
