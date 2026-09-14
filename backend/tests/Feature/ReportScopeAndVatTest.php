<?php

use App\Models\Lifting;
use App\Models\Organization;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Tank;
use App\Models\User;
use App\Services\TaxService;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

function platformOwner(): User
{
    // Deliberately in an organization of its own, holding no trading data —
    // which is what made every report read zero.
    $hq = Organization::firstOrCreate(
        ['name' => 'Owner Hq'],
        ['slug' => 'owner-hq', 'status' => 'active'],
    );

    $owner = User::create([
        'name' => 'Platform Owner',
        'email' => 'owner@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $hq->id,
        'email_verified_at' => now(),
    ]);

    $owner->assignRole(Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']));

    return $owner;
}

// ── Reports must respect the organization scope, not override it ──

test('the platform owner sees trading figures rather than zeros', function () {
    $admin = User::role('admin')->firstOrFail();

    Shift::factory()->create([
        'organization_id' => $admin->organization_id,
        'started_at' => now()->subDay(),
        'total_expected_cash' => 317576,
        'total_tax_collected' => 23524,
    ]);

    $response = actingAs(platformOwner())
        ->getJson('/api/v1/reports/pl?start_date='.now()->subWeek()->toDateString().'&end_date='.now()->toDateString())
        ->assertOk();

    // Before the fix this was 0 shifts and 0 sales, because the query filtered
    // on the caller's own organization instead of letting the scope decide.
    expect($response->json('data.shift_count'))->toBe(1)
        ->and((float) $response->json('data.sales'))->toBe(317576.0);
});

test('the tax summary reaches the same data for the owner', function () {
    $admin = User::role('admin')->firstOrFail();

    Shift::factory()->create([
        'organization_id' => $admin->organization_id,
        'started_at' => now()->subDay(),
        'total_tax_collected' => 23524,
    ]);

    $response = actingAs(platformOwner())
        ->getJson('/api/v1/reports/tax-summary?start_date='.now()->subWeek()->toDateString().'&end_date='.now()->toDateString())
        ->assertOk();

    expect((float) $response->json('data.tax_collected'))->toBe(23524.0);
});

test('a tenant admin still sees only their own organization', function () {
    $admin = User::role('admin')->firstOrFail();

    Shift::factory()->create([
        'organization_id' => $admin->organization_id,
        'started_at' => now()->subDay(),
        'total_expected_cash' => 1000,
    ]);

    // Another tenant's shift, which must never appear.
    $other = Organization::factory()->create();
    Shift::factory()->create([
        'organization_id' => $other->id,
        'started_at' => now()->subDay(),
        'total_expected_cash' => 999999,
    ]);

    $response = actingAs($admin)
        ->getJson('/api/v1/reports/pl?start_date='.now()->subWeek()->toDateString().'&end_date='.now()->toDateString())
        ->assertOk();

    expect($response->json('data.shift_count'))->toBe(1)
        ->and((float) $response->json('data.sales'))->toBe(1000.0);
});

// ── VAT is computed from the captured rate, server side only ──

test('input tax is computed from the captured percentage, not sent by the client', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    $tank = Tank::first();
    $tank->product->update(['vat_rate' => 8]);   // the rate as captured: 8%

    $response = postJson('/api/v1/liftings', [
        'station_id' => $tank->station_id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->toDateString(),
        'volume_liters' => 10000,
        'buying_price_per_liter' => 205,
        'total_cost' => 2050000,
        // A client trying to dictate the tax. It used to be believed.
        'tax_paid' => 164000,
    ])->assertCreated();

    $expected = (new TaxService)->calculateInputTax(2050000, 8);

    expect(round((float) $response->json('data.tax_paid'), 2))->toBe(round($expected, 2))
        ->and((float) $response->json('data.tax_paid'))->not->toBe(164000.0);
});

test('a different captured rate gives a different tax', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    $tank = Tank::first();

    foreach ([16, 8, 0] as $rate) {
        $tank->product->update(['vat_rate' => $rate]);

        $response = postJson('/api/v1/liftings', [
            'station_id' => $tank->station_id,
            'tank_id' => $tank->id,
            'lifting_date' => now()->toDateString(),
            'volume_liters' => 1000,
            'buying_price_per_liter' => 100,
            'total_cost' => 100000,
        ])->assertCreated();

        $expected = (new TaxService)->calculateInputTax(100000, (float) $rate);

        expect(round((float) $response->json('data.tax_paid'), 2))
            ->toBe(round($expected, 2), "rate {$rate} gave the wrong tax");
    }

    // 0% must mean no tax, not a fraction of one.
    expect((new TaxService)->calculateInputTax(100000, 0))->toBe(0.0);
});
