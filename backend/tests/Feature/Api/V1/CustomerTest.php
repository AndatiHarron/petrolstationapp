<?php

use App\Models\Customer;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);
beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('manager can view only their own organization customers', function () {
    // 1. Setup: Create two organizations
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    // 2. Create a Manager for Org A
    $managerA = User::factory()->create(['organization_id' => $orgA->id]);
    $managerA->assignRole('manager');

    // 3. Create customers for both Orgs
    $customerA = Customer::factory()->create(['organization_id' => $orgA->id]);
    $customerB = Customer::factory()->create(['organization_id' => $orgB->id]);

    // 4. Authenticate as Manager A
    Sanctum::actingAs($managerA);

    // 5. Act: Fetch the list
    $response = getJson('/api/v1/customers');

    // 6. Assert: We see Customer A, but NOT Customer B
    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['id' => $customerA->id])
        ->assertJsonMissing(['id' => $customerB->id]);
});

test('manager can create a customer', function () {
    $user = User::factory()->create();
    $user->assignRole('manager');
    Sanctum::actingAs($user);

    $data = [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'phone' => '0700123456',
        'tax_pin' => 'A123456789Z',
        'credit_limit' => 50000,
    ];

    postJson('/api/v1/customers', $data)
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'John Doe')
        // Ensure backend automatically assigned the correct Org ID
        ->assertJsonPath('data.organization_id', $user->organization_id);
});

test('email must be unique', function () {
    $org = Organization::factory()->create();

    $user = User::factory()->create([
        'organization_id' => $org->id,
    ]);
    $user->assignRole('manager');
    Sanctum::actingAs($user);

    // Create existing customer
    Customer::factory()->create([
        'email' => 'taken@example.com',
        'organization_id' => $org->id,
    ]);

    // Try to create another with same email
    postJson('/api/v1/customers', [
        'name' => 'Jane Doe',
        'email' => 'taken@example.com',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('manager cannot delete a customer', function () {
    $user = User::factory()->create();
    $user->assignRole('manager');
    Sanctum::actingAs($user);

    $customer = Customer::factory()->create(['organization_id' => $user->organization_id]);

    // Managers are forbidden from deleting in your Policy
    deleteJson("/api/v1/customers/{$customer->id}")
        ->assertStatus(403);

    // Verify it's still in the DB
    $this->assertDatabaseHas('customers', ['id' => $customer->id]);
});

test('super admin can delete a customer (soft delete)', function () {
    $admin = User::factory()->create();
    $admin->assignRole('super-admin');
    Sanctum::actingAs($admin);

    $customer = Customer::factory()->create();

    deleteJson("/api/v1/customers/{$customer->id}")
        ->assertStatus(200);

    $this->assertSoftDeleted('customers', ['id' => $customer->id]);
});

test('admin can delete a customer from their organization (soft delete)', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $customer = Customer::factory()->create(['organization_id' => $org->id]);

    deleteJson("/api/v1/customers/{$customer->id}")
        ->assertStatus(200);

    $this->assertSoftDeleted('customers', ['id' => $customer->id]);
});

test('admin cannot delete a customer from another organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();
    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    $customerB = Customer::factory()->create(['organization_id' => $orgB->id]);

    deleteJson("/api/v1/customers/{$customerB->id}")
        ->assertNotFound();
});

test('manager cannot view specific customer from another organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $managerA = User::factory()->create(['organization_id' => $orgA->id]);
    $customerB = Customer::factory()->create(['organization_id' => $orgB->id]);

    Sanctum::actingAs($managerA);

    // Try to access ID of a customer from Org B
    getJson("/api/v1/customers/{$customerB->id}")
        ->assertNotFound();
});
