<?php

use App\Models\Lifting;
use App\Models\Nozzle;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use App\Services\ShiftReconciliationService;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

test('calculates output vat correctly on shift lock', function () {
    // 1. Setup: Explicitly Create a Taxable Product
   $user = User::first();
   $station = Station::factory()->create([
       'organization_id' => $user->organization_id,
   ]);

   $product = Product::factory()->create([
       'organization_id' => $user->organization_id,
       'name' => 'Test Petrol',
       'current_price' => 180,
       'vat_rate' => 16.00
   ]);

   $tank = Tank::factory()->create([
       'organization_id' => $user->organization_id,
       'station_id' => $station->id,
       'product_id' => $product->id,
   ]);

   $nozzle = Nozzle::factory()->create([
       'organization_id' => $user->organization_id,
       'station_id' => $station->id,
       'tank_id' => $tank->id,
       'current_reading' => 5000
   ]);

   $shift = Shift::create([
       'station_id' => $station->id,
       'organization_id' => $user->organization_id,
       'started_by_user_id' => $user->id,
       'status' => 'OPEN',
   ]);

    // 2. Scenario: Sell 100 Liters
    // Total Value = 100 * 180 = 18,000
    // Tax Math: 18,000 - (18,000 / 1.16) = 2,482.758... -> 2482.76
   $meters = [
       [
           'nozzle_id' => $nozzle->id,
           'closing_reading' => $nozzle->current_reading + 100
       ]
   ];

   $dips = [];
   $payments = ['cash' => 18000];

   $service = app(ShiftReconciliationService::class);
   $service->reconcile($shift, $meters, $dips, $payments);

   $lockedShift = $shift->refresh();
   expect($lockedShift->total_tax_collected)->toBe(2482.76);
});

test('calculates mixed tax rates correctly (petrol vs kerosene)', function () {
    $user = User::first();
    $station = Station::factory()->create([
        'organization_id' => $user->organization_id,
    ]);

    // 1. Setup Petrol (16% VAT)
    $petrol = Product::factory()->create([
        'organization_id' => $user->organization_id,
        'current_price' => 100,
        'vat_rate' => 16.00
    ]);
    $petrolTank = Tank::factory()->create([
        'station_id' => $station->id,
        'product_id' => $petrol->id,
    ]);
    $petrolNozzle = Nozzle::factory()->create([
        'station_id' => $station->id,
        'tank_id' => $petrolTank->id,
        'current_reading' => 5000
    ]);

    // 2. Setup Kerosene (0% VAT)
    $kerosene = Product::factory()->create([
        'organization_id' => $user->organization_id,
        'name' => 'Kerosene',
        'current_price' => 100,
        'vat_rate' => 0
    ]);

    $keroseneTank = Tank::factory()->create([
        'station_id' => $station->id,
        'product_id' => $kerosene->id,
    ]);

    $keroseneNozzle = Nozzle::factory()->create([
        'station_id' => $station->id,
        'tank_id' => $keroseneTank->id,
        'current_reading' => 5000
    ]);

    $shift = Shift::create([
        'station_id' => $station->id,
        'organization_id' => $user->organization_id,
        'started_by_user_id' => $user->id,
        'status' => 'OPEN'
    ]);

    // 3. Scenario:
    // Sell 100L Petrol (10,000 KES) -> Tax ~1,379
    // Sell 100L Kerosene (10,000 KES) -> Tax 0
    $meters = [
        [
            'nozzle_id' => $petrolNozzle->id,
            'closing_reading' => 5100
        ],
        [
            'nozzle_id' => $keroseneNozzle->id,
            'closing_reading' => 5100
        ]
    ];

    $service = app(ShiftReconciliationService::class);
    $service->reconcile($shift, $meters, [], [
        'cash' => 20000
    ]);

    $lockedShift = $shift->refresh();
    expect($lockedShift->total_tax_collected)->toBe(1379.31);
});

test('verifies net liability logic (sales tax - lifting tax)', function () {
    $user = User::first();
    $orgId = $user->organization_id;
    $station = Station::factory()->create([
        'organization_id' => $orgId,
    ]);
    $tank = Tank::factory()->create([
        'station_id' => $station->id,
        'organization_id' => $orgId,
    ]);

    // 1. Create a Shift with 5,000 Output Tax
    Shift::create([
        'organization_id' => $orgId,
        'station_id' => $station->id,
        'started_by_user_id' => $user->id,
        'status' => 'LOCKED',
        'total_tax_collected' => 5000
    ]);

    // 2. Create a Lifting with 2,000 Input Tax
    Lifting::create([
        'id' => Str::uuid(),
        'organization_id' => $orgId,
        'station_id' => $station->id,
        'tank_id' => $tank->id,
        'lifting_date' => now(),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 100000,
        'tax_paid' => 2000
    ]);

    $output = Shift::where('organization_id', $orgId)->sum('total_tax_collected');
    $input = Lifting::where('organization_id', $orgId)->sum('tax_paid');

    expect($output - $input)->toBe(3000);
});
