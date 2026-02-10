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
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

it('lists credit sales with customer info and pagination', function () {
    seed(RolesAndPermissionsSeeder::class);
    // Setup: Organization, Station, User
    $org = Organization::factory()->create();
    $station = Station::factory()->create(['organization_id' => $org->id]);
    $user = User::factory()->create(['organization_id' => $org->id, 'station_id' => $station->id]);
    $user->assignRole('admin');

    // Auth via Sanctum
    Sanctum::actingAs($user);

    // Create a Shift to attach credit sales to
    $shift = Shift::create([
        'organization_id' => $org->id,
        'station_id' => $station->id,
        'started_by_user_id' => $user->id,
        'status' => 'OPEN',
        'started_at' => now(),
    ]);

    // Customers for the credit sales
    $customerA = Customer::factory()->create(['organization_id' => $org->id]);
    $customerB = Customer::factory()->create(['organization_id' => $org->id]);

    // Create a few credit sales
    CreditSale::create([
        'organization_id' => $org->id,
        'shift_id' => $shift->id,
        'customer_id' => $customerA->id,
        'amount' => 1500.50,
        'vehicle_reg' => 'KAA123A',
        'notes' => 'Diesel',
    ]);

    CreditSale::create([
        'organization_id' => $org->id,
        'shift_id' => $shift->id,
        'customer_id' => $customerB->id,
        'amount' => 250.00,
        'vehicle_reg' => null,
        'notes' => null,
    ]);

    CreditSale::create([
        'organization_id' => $org->id,
        'shift_id' => $shift->id,
        'customer_id' => $customerA->id,
        'amount' => 999.99,
        'vehicle_reg' => 'KBB456B',
        'notes' => 'Petrol',
    ]);

    // Hit the endpoint
    $response = getJson('/api/v1/credit-sales');

    // Assertions
    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'amount',
                    'vehicle_reg',
                    'notes',
                    'organization_id',
                    'shift_id',
                    'customer_id',
                    'customer_name',
                    'created_at',
                ],
            ],
            'links',
            'meta',
        ])
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.customer_name', fn ($name) => ! empty($name));
});
