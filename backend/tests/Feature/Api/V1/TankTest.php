<?php

use App\Models\Organization;
use App\Models\Product;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('admin can create a tank', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $station = Station::factory()->create(['organization_id' => $org->id]);
    $product = Product::factory()->create(['organization_id' => $org->id]);

    $data = [
        'name' => 'Tank 1 - Diesel',
        'station_id' => $station->id,
        'product_id' => $product->id,
        'capacity_liters' => 20000,
        'current_volume' => 5000,
        'calibration_chart' => [
            ['mm' => 0, 'liters' => 0],
            ['mm' => 1000, 'liters' => 10000],
            ['mm' => 2000, 'liters' => 20000],
        ]
    ];

    postJson('/api/v1/tanks', $data)
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Tank 1 - Diesel')
        // Check if logic calculated dip correctly (5000L should be 500mm based on linear chart above)
        ->assertJsonPath('data.current_dip_mm', 500);
});

test('manager cannot create a tank', function () {
    $org = Organization::factory()->create();

    $manager = User::factory()->create(['organization_id' => $org->id]);
    $manager->assignRole('manager'); // Policy restricts create to Admin
    Sanctum::actingAs($manager);

    $station = Station::factory()->create(['organization_id' => $org->id]);
    $product = Product::factory()->create(['organization_id' => $org->id]);

    $data = [
        'name' => 'Unauthorized Tank',
        'station_id' => $station->id,
        'product_id' => $product->id,
        'capacity_liters' => 20000,
        'current_volume' => 5000,
    ];

    postJson('/api/v1/tanks', $data)->assertStatus(403);
});

test('admin cannot create a tank for station in another organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    $stationB = Station::factory()->create(['organization_id' => $orgB->id]); // Station in Org B
    $product = Product::factory()->create();

    $data = [
        'name' => 'Hacker Tank',
        'station_id' => $stationB->id,
        'product_id' => $product->id,
        'capacity_liters' => 10000,
    ];

    // Should fail validation rule: exists:stations where org_id matches user
    postJson('/api/v1/tanks', $data)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['station_id']);
});

test('admin can view tanks in their organization', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    Tank::factory()->count(3)->create(['organization_id' => $org->id]);

    getJson('/api/v1/tanks')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('admin cannot view tanks from other organizations', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    Tank::factory()->create(['organization_id' => $orgB->id]);

    getJson('/api/v1/tanks')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('updating tank chart recalculates the dip reading', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $tank = Tank::factory()->create([
        'organization_id' => $org->id,
        'current_volume' => 5000,
        'current_dip_mm' => 0 // Initially wrong
    ]);

    $chart = [
        ['mm' => 0, 'liters' => 0],
        ['mm' => 2000, 'liters' => 10000], // 5000L should be 1000mm
    ];

    putJson("/api/v1/tanks/{$tank->id}", ['calibration_chart' => $chart])
        ->assertOk()
        ->assertJsonPath('data.current_dip_mm', 1000);
});
