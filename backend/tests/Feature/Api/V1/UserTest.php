<?php

use App\Models\Organization;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('super admin can create new admins associated to an organization', function () {
    $org = Organization::factory()->create();
    $superAdmin = User::factory()->create(['organization_id' => null]);
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    $response = postJson('/api/v1/users', [
        'name' => 'Admin User',
        'email' => 'admin@example.com',
        'password' => 'password',
        'organization_id' => $org->id,
        'role' => 'admin',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('users', [
        'name' => 'Admin User',
        'email' => 'admin@example.com',
        'organization_id' => $org->id,
    ]);

    $user = User::where('email', 'admin@example.com')->first();
    expect($user->hasRole('admin'))->toBeTrue();
});

test('admin can create managers assigned to stations in their organization', function () {
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = postJson('/api/v1/users', [
        'name' => 'Manager User',
        'email' => 'manager@example.com',
        'password' => 'password',
        'station_id' => $station->id,
        'role' => 'manager',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('users', [
        'name' => 'Manager User',
        'email' => 'manager@example.com',
        'organization_id' => $org->id,
        'station_id' => $station->id,
    ]);

    $user = User::where('email', 'manager@example.com')->first();
    expect($user->hasRole('manager'))->toBeTrue();
});

test('admin cannot create new admins', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = postJson('/api/v1/users', [
        'name' => 'Another Admin',
        'email' => 'another_admin@example.com',
        'password' => 'password',
        'role' => 'admin',
    ]);

    $response->assertUnprocessable();
});

test('admin cannot create users for another organization', function () {
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();
    $station2 = Station::factory()->create(['organization_id' => $org2->id]);

    $admin = User::factory()->create(['organization_id' => $org1->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = postJson('/api/v1/users', [
        'name' => 'Manager User',
        'email' => 'manager@example.com',
        'password' => 'password',
        'organization_id' => $org2->id,
        'station_id' => $station2->id,
        'role' => 'manager',
    ]);

    // Even if they try to specify organization_id, it should be restricted to their own org or fail validation if they try to use a station from another org
    $response->assertForbidden();
});

test('manager cannot create users', function () {
    $org = Organization::factory()->create();
    $manager = User::factory()->create(['organization_id' => $org->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $response = postJson('/api/v1/users', [
        'name' => 'Sub Manager',
        'email' => 'submanager@example.com',
        'password' => 'password',
        'role' => 'manager',
    ]);

    $response->assertForbidden();
});

test('super admin can list all users', function () {
    User::factory()->count(5)->create();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    $response = getJson('/api/v1/users');

    $response->assertOk();
    $response->assertJsonCount(User::count(), 'data');
});

test('admin can list users in their organization only', function () {
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();

    User::factory()->count(3)->create(['organization_id' => $org1->id]);
    User::factory()->count(2)->create(['organization_id' => $org2->id]);

    $admin = User::factory()->create(['organization_id' => $org1->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = getJson('/api/v1/users');

    $response->assertOk();
    // 3 + 1 admin = 4
    $response->assertJsonCount(4, 'data');
});

test('manager cannot list users', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    getJson('/api/v1/users')->assertForbidden();
});

test('admin can view a user in their organization', function () {
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    getJson("/api/v1/users/{$user->id}")->assertOk();
});

test('admin cannot view a user from another organization', function () {
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();
    $user2 = User::factory()->create(['organization_id' => $org2->id]);

    $admin1 = User::factory()->create(['organization_id' => $org1->id]);
    $admin1->assignRole('admin');
    Sanctum::actingAs($admin1);

    getJson("/api/v1/users/{$user2->id}")->assertNotFound();
});
