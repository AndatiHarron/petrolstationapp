<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Shift;
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

test('super admin can see credit sales from all organizations', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $stationA = Station::factory()->create(['organization_id' => $orgA->id]);
    $stationB = Station::factory()->create(['organization_id' => $orgB->id]);

    $userA = User::factory()->create(['organization_id' => $orgA->id, 'station_id' => $stationA->id]);
    $userB = User::factory()->create(['organization_id' => $orgB->id, 'station_id' => $stationB->id]);

    $shiftA = Shift::factory()->create(['organization_id' => $orgA->id, 'station_id' => $stationA->id, 'started_by_user_id' => $userA->id]);
    $shiftB = Shift::factory()->create(['organization_id' => $orgB->id, 'station_id' => $stationB->id, 'started_by_user_id' => $userB->id]);

    $customerA = Customer::factory()->create(['organization_id' => $orgA->id]);
    $customerB = Customer::factory()->create(['organization_id' => $orgB->id]);

    CreditSale::factory()->create(['organization_id' => $orgA->id, 'shift_id' => $shiftA->id, 'customer_id' => $customerA->id]);
    CreditSale::factory()->create(['organization_id' => $orgB->id, 'shift_id' => $shiftB->id, 'customer_id' => $customerB->id]);

    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    Sanctum::actingAs($superAdmin);

    getJson('/api/v1/credit-sales')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('admin can see credit sales only from their organization', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $stationA = Station::factory()->create(['organization_id' => $orgA->id]);
    $stationB = Station::factory()->create(['organization_id' => $orgB->id]);

    $userA = User::factory()->create(['organization_id' => $orgA->id, 'station_id' => $stationA->id]);
    $userB = User::factory()->create(['organization_id' => $orgB->id, 'station_id' => $stationB->id]);

    $shiftA = Shift::factory()->create(['organization_id' => $orgA->id, 'station_id' => $stationA->id, 'started_by_user_id' => $userA->id]);
    $shiftB = Shift::factory()->create(['organization_id' => $orgB->id, 'station_id' => $stationB->id, 'started_by_user_id' => $userB->id]);

    $customerA = Customer::factory()->create(['organization_id' => $orgA->id]);
    $customerB = Customer::factory()->create(['organization_id' => $orgB->id]);

    CreditSale::factory()->create(['organization_id' => $orgA->id, 'shift_id' => $shiftA->id, 'customer_id' => $customerA->id]);
    CreditSale::factory()->create(['organization_id' => $orgB->id, 'shift_id' => $shiftB->id, 'customer_id' => $customerB->id]);

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    getJson('/api/v1/credit-sales')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('station manager can see credit sales only from their station', function () {
    $org = Organization::factory()->create();

    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    $userA = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $userB = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id]);

    $shiftA = Shift::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id, 'started_by_user_id' => $userA->id]);
    $shiftB = Shift::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id, 'started_by_user_id' => $userB->id]);

    $customer = Customer::factory()->create(['organization_id' => $org->id]);

    CreditSale::factory()->create(['organization_id' => $org->id, 'shift_id' => $shiftA->id, 'customer_id' => $customer->id]);
    CreditSale::factory()->create(['organization_id' => $org->id, 'shift_id' => $shiftB->id, 'customer_id' => $customer->id]);

    $managerA = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $managerA->assignRole('manager');
    Sanctum::actingAs($managerA);

    getJson('/api/v1/credit-sales')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('station manager cannot view a credit sale from another station', function () {
    $org = Organization::factory()->create();
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    $userB = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id]);
    $shiftB = Shift::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id, 'started_by_user_id' => $userB->id]);
    $customer = Customer::factory()->create(['organization_id' => $org->id]);
    $saleB = CreditSale::factory()->create(['organization_id' => $org->id, 'shift_id' => $shiftB->id, 'customer_id' => $customer->id]);

    $managerA = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $managerA->assignRole('manager');
    Sanctum::actingAs($managerA);

    getJson("/api/v1/credit-sales/{$saleB->id}")
        ->assertForbidden();
});

test('station manager cannot create a credit sale for a shift in another station', function () {
    $org = Organization::factory()->create();
    $stationA = Station::factory()->create(['organization_id' => $org->id]);
    $stationB = Station::factory()->create(['organization_id' => $org->id]);

    $userB = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id]);
    $shiftB = Shift::factory()->create(['organization_id' => $org->id, 'station_id' => $stationB->id, 'started_by_user_id' => $userB->id]);
    $customer = Customer::factory()->create(['organization_id' => $org->id]);

    $managerA = User::factory()->create(['organization_id' => $org->id, 'station_id' => $stationA->id]);
    $managerA->assignRole('manager');
    Sanctum::actingAs($managerA);

    postJson('/api/v1/credit-sales', [
        'shift_id' => $shiftB->id,
        'customer_id' => $customer->id,
        'amount' => 1000,
        'vehicle_reg' => 'KAA 001A',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['shift_id']);
});
