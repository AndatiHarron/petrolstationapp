<?php

use App\Models\DipReading;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');
});

function closeShift(array $meterOverrides = [], array $dipOverrides = []): Illuminate\Testing\TestResponse
{
    $manager = User::where('email', 'manager@octane.com')->firstOrFail();
    actingAs($manager);

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    return postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => ['cash' => 18000, 'mpesa' => 0],
        'meters' => [array_merge([
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading + 100,
        ], $meterOverrides)],
        'dips' => [array_merge([
            'tank_id' => $tank->id,
            'dip_mm' => $tank->current_dip_mm,
        ], $dipOverrides)],
    ]);
}

// ── The meter chain: a shift opens where the last one closed ──

test('a shift opens on the reading the previous one closed with', function () {
    $nozzle = Nozzle::first();
    $start = (float) $nozzle->current_reading;

    closeShift()->assertOk();

    expect((float) $nozzle->fresh()->current_reading)->toBe($start + 100);
});

test('an opening reading that disagrees with the last close is refused', function () {
    $nozzle = Nozzle::first();

    // 200 litres quietly written out of the chain: the shift would open above
    // where the last one closed, and nothing downstream would show the gap.
    $response = closeShift([
        'opening_reading' => $nozzle->current_reading + 200,
        'closing_reading' => $nozzle->current_reading + 300,
    ]);

    // A refusal, not a fault: the supervisor can re-read the pump and retry.
    $response->assertStatus(422);
    expect($response->json('message'))->toContain('last shift closed it on')
        ->and($response->json('error'))->toBe('shift_not_reconciled');

    // Nothing was recorded, and the nozzle did not move.
    expect(Shift::where('status', 'LOCKED')->count())->toBe(0);
});

test('a nozzle that has never been read takes its baseline from the pump', function () {
    // A fresh installation: no reading recorded yet, so there is no chain to
    // break and the figure on the pump is the only source of truth.
    $nozzle = Nozzle::first();
    $nozzle->update(['current_reading' => 0]);

    closeShift([
        'opening_reading' => 8400,
        'closing_reading' => 8500,
    ])->assertOk();

    expect((float) $nozzle->fresh()->current_reading)->toBe(8500.0);

    $reading = $nozzle->fresh()->meterReadings()->latest()->first();
    expect((float) $reading->opening_reading)->toBe(8400.0)
        ->and((float) $reading->volume_sold)->toBe(100.0);
});

// ── Dips: no calibration chart means no claim about volume ──

test('a tank with no calibration chart reports no stock variance rather than a false one', function () {
    $tank = Tank::first();
    $tank->update(['calibration_chart' => null]);

    $response = closeShift()->assertOk();

    // The old behaviour converted the dip to zero litres, making it look like
    // the tank had been emptied, and charged the whole shift's sales as a loss.
    expect((float) $response->json('data.wet_stock.variance_liters'))->toBe(0.0);

    $dip = DipReading::latest()->first();
    expect($dip->volume_liters)->toBeNull()
        ->and((float) $dip->dip_mm)->toBe((float) $tank->current_dip_mm);
});

test('the dip depth is still recorded when it cannot be converted', function () {
    $tank = Tank::first();
    $tank->update(['calibration_chart' => null]);

    closeShift([], ['dip_mm' => 1234])->assertOk();

    expect((float) $tank->fresh()->current_dip_mm)->toBe(1234.0)
        ->and((float) DipReading::latest()->first()->dip_mm)->toBe(1234.0);
});

test('a tank with a chart still reconciles normally', function () {
    $tank = Tank::first();

    expect($tank->calibration_chart)->not->toBeEmpty();

    $response = closeShift()->assertOk();

    expect($response->json('data.wet_stock'))->toHaveKey('variance_liters')
        ->and(DipReading::latest()->first()->volume_liters)->not->toBeNull();
});

test('an approved edit request may restate an opening reading the chain check would refuse', function () {
    // The correction workflow exists to fix a mis-keyed reading after the fact.
    // It is reviewed by an admin and written to the audit log, so it sets the
    // figure instead of being measured against the nozzle — otherwise the
    // integrity rule would make a recorded mistake permanent.
    $nozzle = Nozzle::first();
    closeShift()->assertOk();

    $advanced = (float) $nozzle->fresh()->current_reading;

    $service = app(App\Services\ShiftReconciliationService::class);
    $shift = Shift::where('status', 'LOCKED')->firstOrFail();
    $shift->meterReadings()->delete();
    $shift->dipReadings()->delete();

    $service->reconcile(
        $shift,
        [[
            'nozzle_id' => $nozzle->id,
            // Deliberately unrelated to where the nozzle now stands.
            'opening_reading' => $advanced - 500,
            'closing_reading' => $advanced,
        ]],
        [],
        ['cash' => 0, 'mpesa' => 0],
        isApprovedCorrection: true,
    );

    expect((float) $shift->meterReadings()->first()->opening_reading)->toBe($advanced - 500)
        ->and((float) $shift->meterReadings()->first()->volume_sold)->toBe(500.0);
});

test('a refused close leaves no orphaned photo in storage', function () {
    // The photo is stored before reconciliation runs, so a close refused by the
    // chain check would otherwise leave an object in the bucket that no row
    // points at — and refusal is a normal event, not an exceptional one.
    $nozzle = Nozzle::first();
    closeShift()->assertOk();

    $advanced = (float) $nozzle->fresh()->current_reading;
    $before = Storage::disk('evidence-store')->files('meter-evidence');

    $response = closeShift([
        'opening_reading' => $advanced + 500,
        'closing_reading' => $advanced + 600,
        'evidence' => Illuminate\Http\UploadedFile::fake()->image('rejected.jpg'),
    ]);

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('last shift closed it on');

    expect(Storage::disk('evidence-store')->files('meter-evidence'))->toBe($before);
});
