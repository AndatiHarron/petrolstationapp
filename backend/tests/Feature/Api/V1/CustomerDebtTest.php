<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('it can filter customers by debt status', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    // Create 3 customers
    $customerWithDebtHigh = Customer::factory()->create([
        'organization_id' => $org->id,
        'current_balance' => 5000,
        'name' => 'Debt High',
    ]);

    $customerWithDebtLow = Customer::factory()->create([
        'organization_id' => $org->id,
        'current_balance' => 1000,
        'name' => 'Debt Low',
    ]);

    $customerNoDebt = Customer::factory()->create([
        'organization_id' => $org->id,
        'current_balance' => 0,
        'name' => 'No Debt',
    ]);

    // 1. Test filtering ?has_debt=1
    $response = getJson('/api/v1/customers?has_debt=1');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonFragment(['name' => 'Debt High'])
        ->assertJsonFragment(['name' => 'Debt Low'])
        ->assertJsonMissing(['name' => 'No Debt']);

    // 2. Test sorting (highest balance first)
    $data = $response->json('data');
    expect($data[0]['name'])->toBe('Debt High');
    expect($data[1]['name'])->toBe('Debt Low');
});

test('customer resource includes last_sale_date', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $customer = Customer::factory()->create([
        'organization_id' => $org->id,
    ]);

    // Create a credit sale
    $creditSale = CreditSale::factory()->create([
        'organization_id' => $org->id,
        'customer_id' => $customer->id,
        'amount' => 1000,
        'created_at' => now()->subDays(5),
    ]);

    $response = getJson("/api/v1/customers/{$customer->id}");

    $response->assertOk()
        ->assertJsonPath('data.last_sale_date', $creditSale->created_at->toIso8601String());
});
