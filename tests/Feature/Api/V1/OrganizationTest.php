<?php

use App\Models\Organization;
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

test('super admin can create new organizations', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    $response = postJson('/api/v1/organizations', [
        'name' => 'New Organization',
        'slug' => 'new-organization',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('organizations', [
        'name' => 'New Organization',
        'slug' => 'new-organization',
    ]);
});

test('admin cannot create new organizations', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = postJson('/api/v1/organizations', [
        'name' => 'Another Organization',
        'slug' => 'another-organization',
    ]);

    $response->assertForbidden();
});

test('manager cannot create new organizations', function () {
    $org = Organization::factory()->create();
    $manager = User::factory()->create(['organization_id' => $org->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $response = postJson('/api/v1/organizations', [
        'name' => 'Another Organization',
        'slug' => 'another-organization',
    ]);

    $response->assertForbidden();
});

test('super admin can list organizations', function () {
    Organization::factory()->count(3)->create();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    $response = getJson('/api/v1/organizations');

    $response->assertOk();
    $response->assertJsonCount(Organization::count(), 'data');
});

test('admin cannot list organizations', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    getJson('/api/v1/organizations')->assertForbidden();
});

test('super admin can view an organization', function () {
    $org = Organization::factory()->create();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    getJson("/api/v1/organizations/{$org->id}")->assertOk();
});

test('admin can view their own organization', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    getJson("/api/v1/organizations/{$org->id}")->assertOk();
});

test('admin cannot view another organization', function () {
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();
    $admin1 = User::factory()->create(['organization_id' => $org1->id]);
    $admin1->assignRole('admin');
    Sanctum::actingAs($admin1);

    getJson("/api/v1/organizations/{$org2->id}")->assertForbidden();
});
