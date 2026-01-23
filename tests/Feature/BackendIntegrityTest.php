<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Lifting;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(DevSeeder::class);
});

// --- TEST GROUP 1: INVENTORY INTEGRITY ---

test('inventory updates automatically on lifting creation and deletion', function () {
    // 1. Setup
    $user = User::first();
    $tank = Tank::factory()->create([
        'organization_id' => $user->organization_id,
        'current_volume' => 1000,
        'capacity_liters' => 20000
    ]);

    // 2. Action: Create a "Lifting" (Delivery of 5,000 Liters)
    $lifting = Lifting::create([
        'id' => Str::uuid(),
        'organization_id' => $user->organization_id,
        'station_id' => $tank->station_id,
        'tank_id' => $tank->id,
        'lifting_date' => now(),
        'volume_liters' => 5000,
        'buying_price_per_liter' => 150,
        'total_cost' => 750000
    ]);

    // 3. Assert: Tank should now have 6,000 Liters
    expect(round($tank->refresh()->current_volume, 2))->toBe(6000.00);

    // 4. Action: Delete the Lifting (Simulate "Ghost Delivery" / Undo)
    $lifting->delete();

    // 5. Assert: Tank should revert to 1,000 Liters
    expect(round($tank->refresh()->current_volume, 2))->toBe(1000.00);
});

// --- TEST GROUP 2: SECURITY & ISOLATION ---

test('tenants cannot access each others customers', function () {
    // 1. Setup: Create Two Distinct Organizations
    $orgA = Organization::create([
        'name' => 'Org A',
        'slug' => Str::slug('Org A'),
        'status' => 'active'
    ]);
    $userA = User::factory()->create([
        'organization_id' => $orgA->id
    ]);

    $orgB = Organization::create([
        'name' => 'Org B',
        'slug' => Str::slug('Org B'),
        'status' => 'active'
    ]);
    $userB = User::factory()->create([
        'organization_id' => $orgB->id
    ]);

    // 2. Create a Customer for Org A
    $customerA = Customer::create([
        'id' => Str::uuid(),
        'organization_id' => $orgA->id,
        'name' => 'Unique Customer A',
        'email' => 'customer.a@orga.com'
    ]);

    // 3. Act as User B (The Attacker)
    actingAs($userB);

    // 4. Attempt: Try to find Customer A using the Model (Global Scope should block this)
    $found = Customer::find($customerA->id);

    // 5. Assert: Should return NULL because User B is scoped to Org B
    expect($found)->toBeNull();

    // 6. Control Test: Ensure User A CAN find it
    actingAs($userA);
    expect(Customer::find($customerA->id))->not->toBeNull();
});

test('api blocks access to shifts from other organizations', function () {
    // 1. Setup
    $orgA = Organization::create([
        'name' => 'Org A',
        'slug' => Str::slug('Org A'),
    ]);
    $userA = User::factory()->create([
        'organization_id' => $orgA->id
    ]);

    $orgB = Organization::create([
        'name' => 'Org B',
        'slug' => Str::slug('Org B'),
    ]);
    $userB = User::factory()->create([
        'organization_id' => $orgB->id
    ]);

    // Create a Shift for Org A
    $shiftA = Shift::create([
        'organization_id' => $orgA->id,
        'station_id' => Station::factory()->create(['organization_id' => $orgA->id])->id,
        'started_by_user_id' => $userA->id,
        'status' => 'OPEN',
    ]);

    // 2. Act as User B
    actingAs($userB);

    // 3. Attempt to "Lock" User A's shift via API
    $response = postJson("/api/v1/shifts/{$shiftA->id}/lock", []);

    // 4. Assert: Should be 404 (Not Found) or 403 (Forbidden)
    // Because the Global Scope makes it look like the record doesn't exist
    $response->assertStatus(404);
});

// --- TEST GROUP 3: FINANCIAL INTEGRITY ---
test('credit sales strictly update customer balance', function () {
    $user = User::first();
    $customer = Customer::create([
        'organization_id' => $user->organization_id,
        'name' => 'Test Debtor',
        'email' => 'test.debtor@org.com',
        'current_balance' => 0,
    ]);

    $shift = Shift::create([
        'organization_id' => $user->organization_id,
        'station_id' => Station::first()->id,
        'started_by_user_id' => $user->id,
        'status' => 'OPEN',
    ]);

    // Create a manual credit sale (simulating the Service logic)
    CreditSale::create([
        'organization_id' => $user->organization_id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 5000,
    ]);

    // Assert Balance increased
    expect($customer->refresh()->current_balance)->toBe(5000);

    // Create another one
    CreditSale::create([
        'organization_id' => $user->organization_id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 2000,
    ]);

    //Assert accumulation
    expect($customer->refresh()->current_balance)->toBe(7000);
});
