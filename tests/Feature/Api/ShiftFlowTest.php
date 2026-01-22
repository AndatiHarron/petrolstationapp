<?php

use App\Models\Nozzle;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(DevSeeder::class);
});

test('full shift lifecycle with perfect math and image evidence', function () {
    Storage::fake('public');

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
        'payments' => [
            'cash' => 18000,
            'mpesa' => 0,
            'credit' => 0,
        ],
        'meters' => [
            [
                'nozzle_id' => $nozzle->id,
                'opening_reading' => 5000,
                'closing_reading' => 5100,
                'evidence' => UploadedFile::fake()->image('pump_reading.jpg'),
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
        ->assertJsonPath('data.financials.collected', 18000)
        ->assertJsonPath('data.financials.variance', 0);

    $evidencePath = $lockResponse->json('data.readings.0.evidence_path');
    expect($evidencePath)->not->toBeNull();

    Storage::disk('public')->assertExists($evidencePath);
});

test('detects theft variance', function () {
    $user = User::where('email', 'attendant@octane.com')->first();
    actingAs($user);

    $start = postJson('/api/v1/shifts/start');
    $shiftId = $start->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    $payload = [
        'payments' => [
            'cash' => 13000,
        ],
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
