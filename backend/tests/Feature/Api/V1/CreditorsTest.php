<?php

use App\Models\Lifting;
use App\Models\Organization;
use App\Models\Station;
use App\Models\Supplier;
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

it('allows admin to create and view suppliers', function () {
    $org = Organization::factory()->create();

    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    // Create supplier
    $create = postJson('/api/v1/creditors', [
        'name' => 'Acme Fuels',
        'email' => 'acme@example.com',
        'phone' => '+254700000000',
    ])->assertStatus(201);

    $supplierId = Supplier::query()->value('id');

    // Index should include the supplier
    getJson('/api/v1/creditors')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Acme Fuels');

    // Show supplier
    getJson("/api/v1/creditors/{$supplierId}")
        ->assertOk()
        ->assertJsonPath('data.name', 'Acme Fuels');
});

it('scopes suppliers to organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    // Supplier in org B
    Supplier::factory()->create(['organization_id' => $orgB->id, 'name' => 'OrgB Supplier']);

    // Admin in org A should not see org B supplier due to global scope
    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    getJson('/api/v1/creditors')
        ->assertOk()
        ->assertJsonMissingPath('data.0.name');
});

it('requires supplier_id when lifting is on credit and updates balances accordingly', function () {
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
        'current_volume' => 0,
    ]);

    $supplier = Supplier::factory()->create(['organization_id' => $org->id]);

    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    // 422 when is_credit is true and supplier_id missing
    postJson('/api/v1/liftings', [
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->format('Y-m-d'),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 100000,
        'is_credit' => true,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['supplier_id']);

    // Valid credit lifting updates supplier balance
    postJson('/api/v1/liftings', [
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->format('Y-m-d'),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 100000,
        'is_credit' => true,
        'supplier_id' => $supplier->id,
    ])->assertStatus(201);

    expect((float) $supplier->refresh()->current_balance)->toBe(100000.0);
});

it('decrements supplier balance when a credit lifting is deleted', function () {
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
        'current_volume' => 0,
    ]);

    $supplier = Supplier::factory()->create(['organization_id' => $org->id]);

    // Create credit lifting via API to ensure events run
    $manager = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $response = postJson('/api/v1/liftings', [
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->format('Y-m-d'),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 150000,
        'is_credit' => true,
        'supplier_id' => $supplier->id,
    ])->assertStatus(201);

    $liftingId = $response->json('data.id');

    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    deleteJson("/api/v1/liftings/{$liftingId}")
        ->assertOk();

    expect((float) $supplier->refresh()->current_balance)->toBe(0.0);
});

it('allows admin to update and delete supplier', function () {
    $org = Organization::factory()->create();
    $supplier = Supplier::factory()->create(['organization_id' => $org->id, 'name' => 'Old Name']);

    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    putJson("/api/v1/creditors/{$supplier->id}", [
        'name' => 'New Name',
    ])->assertOk()
        ->assertJsonPath('data.name', 'New Name');

    // Admin can delete
    deleteJson("/api/v1/creditors/{$supplier->id}")->assertNoContent();
    expect(Supplier::find($supplier->id))->toBeNull();
});

it('forbids manager from deleting supplier', function () {
    $org = Organization::factory()->create();
    $supplier = Supplier::factory()->create(['organization_id' => $org->id]);

    $manager = User::factory()->create(['organization_id' => $org->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    deleteJson("/api/v1/creditors/{$supplier->id}")->assertForbidden();
});

it('returns 404 when admin tries to delete supplier from another organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();
    $supplierB = Supplier::factory()->create(['organization_id' => $orgB->id]);

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    // Should be 404 because of OrganizationScope
    deleteJson("/api/v1/creditors/{$supplierB->id}")->assertNotFound();
});
