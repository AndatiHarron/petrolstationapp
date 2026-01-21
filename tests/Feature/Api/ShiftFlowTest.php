<?php

use App\Models\Nozzle;
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

test('full shift lifecycle with perfect math', function () {
    $user = User::where('email', 'attendant@octane.com')->first();
    actingAs($user);

    $startResponse = postJson('/api/v1/shifts/start');
    $startResponse->assertStatus(201);
    $shiftId = $startResponse->json('data.id');

    $nozzle = Nozzle::first();
    $tank = Tank::first();

    // Scenario: Sold 100 Liters.
    // Price = 180. Expected Cash = 18,000.
    // Tank Dip should drop by 20mm (since 1mm = 5L in our Seeder).
    $payload = [
        'cash_collected' => 18000,
        'meters' => [
            [
                'nozzle_id' => $nozzle->id,
                'opening_reading' => 5000,
                'closing_reading' => 5100,
            ]
        ],
        'dips' => [
            [
                'tank_id' => $tank->id,
                'dip_mm' => 1980
            ]
        ]
    ];

    $lockResponse = postJson("/api/v1/shifts/{$shiftId}/lock", $payload);

    $lockResponse->assertStatus(200)
        ->assertJsonPath('data.status', 'LOCKED')
        ->assertJsonPath('data.financials.expected', 18000)
        ->assertJsonPath('data.financials.variance', 0);
});

test('detects theft variance', function () {
    $user = User::where('email', 'attendant@octane.com')->first();
    actingAs($user);

    $start = postJson('/api/v1/shifts/start');
    $shiftId = $start->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    $payload = [
        'cash_collected' => 13000,
        'meters' => [
            [
                'nozzle_id' => $nozzle->id,
                'opening_reading' => 5000,
                'closing_reading' => 5100,
            ]
        ],
        'dips' => [
            [
                'tank_id' => $tank->id,
                'dip_mm' => 1980
            ]
        ]
    ];

    $res = postJson("/api/v1/shifts/{$shiftId}/lock", $payload);

    $res->assertStatus(200);
    expect($res->json('data.financials.variance'))->toBe(-5000)
        ->and($res->json('data.variance_alert'))->toBeTrue();

});
