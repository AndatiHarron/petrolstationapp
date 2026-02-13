<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Lifting;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    $this->organization = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->organization->id]);
    $this->user->assignRole('admin');
    Sanctum::actingAs($this->user);
});

it('can get debt aging report', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'current_balance' => 0]);

    // Create sales in different buckets
    CreditSale::factory()->create([
        'customer_id' => $customer->id,
        'organization_id' => $this->organization->id,
        'amount' => 1000,
        'created_at' => now()->subDays(10), // 0-30
    ]);

    CreditSale::factory()->create([
        'customer_id' => $customer->id,
        'organization_id' => $this->organization->id,
        'amount' => 2000,
        'created_at' => now()->subDays(40), // 31-60
    ]);

    $response = getJson('/api/v1/reports/debt-aging');

    $response->assertOk()
        ->assertJsonPath('data.0.customer_name', $customer->name)
        ->assertJsonPath('data.0.buckets.0-30', 1000)
        ->assertJsonPath('data.0.buckets.31-60', 2000);
});

it('can get p&l report', function () {
    Shift::factory()->create([
        'organization_id' => $this->organization->id,
        'total_expected_cash' => 10000,
        'total_tax_collected' => 1000,
        'created_at' => now(),
    ]);

    Lifting::factory()->create([
        'organization_id' => $this->organization->id,
        'total_cost' => 5000,
        'created_at' => now(),
    ]);

    $response = getJson('/api/v1/reports/pl');

    $response->assertOk()
        ->assertJsonPath('data.sales', 10000)
        ->assertJsonPath('data.costs', 5000)
        ->assertJsonPath('data.taxes', 1000)
        ->assertJsonPath('data.net_profit', 4000);
});

it('can get tax summary report', function () {
    Shift::factory()->create([
        'organization_id' => $this->organization->id,
        'total_tax_collected' => 1500,
        'created_at' => now(),
    ]);

    Lifting::factory()->create([
        'organization_id' => $this->organization->id,
        'tax_paid' => 500,
        'created_at' => now(),
    ]);

    $response = getJson('/api/v1/reports/tax-summary?month='.now()->month.'&year='.now()->year);

    $response->assertOk()
        ->assertJsonPath('data.tax_collected', 1500)
        ->assertJsonPath('data.tax_paid', 500)
        ->assertJsonPath('data.net_tax', 1000);
});

it('can get variance trend report', function () {
    Shift::factory()->create([
        'organization_id' => $this->organization->id,
        'cash_variance' => 100,
        'created_at' => now(),
    ]);

    Shift::factory()->create([
        'organization_id' => $this->organization->id,
        'cash_variance' => -50,
        'created_at' => now(),
    ]);

    $response = getJson('/api/v1/reports/variance-trend?days=7');

    $response->assertOk()
        ->assertJsonPath('data.0.total_variance', 50);
});
