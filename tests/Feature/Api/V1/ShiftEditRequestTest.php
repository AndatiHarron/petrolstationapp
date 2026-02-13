<?php

use App\Models\DipReading;
use App\Models\MeterReading;
use App\Models\Nozzle;
use App\Models\Organization;
use App\Models\Product;
use App\Models\Shift;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create(['organization_id' => $this->organization->id]);
    $this->admin->assignRole('admin');
    $this->user = User::factory()->create(['organization_id' => $this->organization->id]);
    $this->user->assignRole('manager');

    $this->station = Station::factory()->create(['organization_id' => $this->organization->id]);
    $this->product = Product::factory()->create(['organization_id' => $this->organization->id]);
    $this->tank = Tank::factory()->create([
        'organization_id' => $this->organization->id,
        'station_id' => $this->station->id,
        'product_id' => $this->product->id,
    ]);
    $this->nozzle = Nozzle::factory()->create([
        'organization_id' => $this->organization->id,
        'station_id' => $this->station->id,
        'tank_id' => $this->tank->id,
    ]);

    $this->shift = Shift::create([
        'organization_id' => $this->organization->id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->user->id,
        'status' => 'LOCKED',
        'started_at' => now()->subHours(8),
    ]);

    $this->meterReading = MeterReading::create([
        'organization_id' => $this->organization->id,
        'shift_id' => $this->shift->id,
        'nozzle_id' => $this->nozzle->id,
        'opening_reading' => 1000,
        'closing_reading' => 1100,
        'volume_sold' => 100,
        'price_per_liter' => 200,
        'total_value' => 20000,
    ]);

    $this->dipReading = DipReading::create([
        'organization_id' => $this->organization->id,
        'shift_id' => $this->shift->id,
        'tank_id' => $this->tank->id,
        'dip_mm' => 1500,
        'volume_liters' => 5000,
    ]);
});

it('captures original data for shift meters and dips', function () {
    Sanctum::actingAs($this->user);

    $requestedData = [
        'meters' => [
            [
                'nozzle_id' => $this->nozzle->id,
                'closing_reading' => 1200,
            ],
        ],
        'dips' => [
            [
                'tank_id' => $this->tank->id,
                'dip_mm' => 1400,
            ],
        ],
        'payments' => [
            'cash' => 10000,
        ],
    ];

    $response = postJson('/api/v1/edit-requests', [
        'model_type' => Shift::class,
        'model_id' => $this->shift->id,
        'requested_data' => $requestedData,
        'reason' => 'Wrong readings entered',
    ]);

    $response->assertStatus(201);

    $originalData = $response->json('data.original_data');

    expect($originalData)->toHaveKey('meters');
    expect($originalData)->toHaveKey('dips');
    expect($originalData)->toHaveKey('payments');
    expect($originalData['meters'])->not->toBeNull();
    expect($originalData['dips'])->not->toBeNull();
    expect($originalData['payments'])->not->toBeNull();
    expect($originalData['meters'])->toBeArray();
    expect($originalData['dips'])->toBeArray();
});

it('handles readings key as an alias for meters', function () {
    Sanctum::actingAs($this->user);

    $requestedData = [
        'readings' => [
            [
                'nozzle_id' => $this->nozzle->id,
                'closing_reading' => 1300,
            ],
        ],
    ];

    $response = postJson('/api/v1/edit-requests', [
        'model_type' => Shift::class,
        'model_id' => $this->shift->id,
        'requested_data' => $requestedData,
    ]);

    $response->assertStatus(201);
    $originalData = $response->json('data.original_data');

    expect($originalData)->toHaveKey('readings');
    expect($originalData['readings'])->toBeArray();
    expect($originalData['readings'][0]['nozzle_id'])->toBe($this->nozzle->id);
});

it('can approve an edit request for a shift', function () {
    Sanctum::actingAs($this->user);

    $requestedData = [
        'meters' => [
            [
                'nozzle_id' => $this->nozzle->id,
                'closing_reading' => 1200,
            ],
        ],
        'dips' => [
            [
                'tank_id' => $this->tank->id,
                'dip_mm' => 1400,
            ],
        ],
        'payments' => [
            'cash' => 12000,
            'mpesa' => 4000,
        ],
    ];

    $response = postJson('/api/v1/edit-requests', [
        'model_type' => Shift::class,
        'model_id' => $this->shift->id,
        'requested_data' => $requestedData,
        'reason' => 'Correcting readings',
    ]);

    $response->assertStatus(201);
    $editRequestId = $response->json('data.id');

    Sanctum::actingAs($this->admin);

    $response = patchJson("/api/v1/edit-requests/{$editRequestId}", [
        'status' => 'approved',
        'comments' => 'Reading corrections approved',
    ]);

    $response->assertStatus(200);

    // Verify shift was updated
    $this->shift->refresh();
    // We expect the related records to be updated.
    // MeterReading should have closing_reading = 1200
    expect($this->shift->meterReadings->first()->closing_reading)->toEqual(1200);
    // DipReading should have dip_mm = 1400
    expect($this->shift->dipReadings->first()->dip_mm)->toEqual(1400);
    // Payments should be updated
    expect($this->shift->payments->where('method', 'cash')->first()->amount)->toEqual(12000);
    expect($this->shift->payments->where('method', 'mpesa')->first()->amount)->toEqual(4000);
});
