<?php

use App\Models\DipReading;
use App\Models\Nozzle;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;
use function Pest\Laravel\withHeaders;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $this->manager = User::where('email', 'manager@octane.com')->firstOrFail();
    $this->admin = User::where('email', 'admin@octane.com')->firstOrFail();
});

// ── The offline queue can replay safely ───────────────────────────────

test('a replayed write is answered from the first response, not run again', function () {
    actingAs($this->manager);

    $key = (string) Str::uuid();

    $first = withHeaders(['Idempotency-Key' => $key])
        ->postJson('/api/v1/shifts/start')
        ->assertSuccessful();

    // The device never saw the response and sends the same request again.
    $second = withHeaders(['Idempotency-Key' => $key])
        ->postJson('/api/v1/shifts/start')
        ->assertSuccessful();

    expect($second->json('data.id'))->toBe($first->json('data.id'))
        ->and($second->headers->get('Idempotent-Replay'))->toBe('true')
        ->and(Shift::count())->toBe(1);
});

test('the same key with a different body is refused rather than mis-answered', function () {
    actingAs($this->manager);

    $key = (string) Str::uuid();
    $customerPayload = ['name' => 'Rift Valley Haulage', 'email' => 'rift@example.com'];

    withHeaders(['Idempotency-Key' => $key])
        ->postJson('/api/v1/customers', $customerPayload)
        ->assertSuccessful();

    withHeaders(['Idempotency-Key' => $key])
        ->postJson('/api/v1/customers', ['name' => 'Someone Else', 'email' => 'else@example.com'])
        ->assertStatus(422);
});

test('a request with no idempotency key behaves exactly as before', function () {
    actingAs($this->manager);

    postJson('/api/v1/shifts/start')->assertSuccessful();

    expect(Shift::count())->toBe(1);
});

// ── M-Pesa references are kept ────────────────────────────────────────

test('a till total is stored with its reference', function () {
    actingAs($this->manager);

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => [
            'cash' => 1000,
            'mpesa' => 4000,
            'mpesa_reference' => 'TILL-884213',
        ],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading + 10,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => $tank->current_dip_mm]],
    ])->assertOk();

    $mpesa = Payment::where('shift_id', $shiftId)->where('method', 'mpesa')->firstOrFail();

    expect($mpesa->reference_code)->toBe('TILL-884213')
        ->and((float) $mpesa->amount)->toBe(4000.0);
});

test('individual transactions are stored one row per code', function () {
    actingAs($this->manager);

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => [
            'cash' => 0,
            'mpesa' => [
                ['amount' => 1500, 'reference_code' => 'SJK4H2LM01'],
                ['amount' => 2500, 'reference_code' => 'SJK4H2LM02'],
            ],
        ],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading + 10,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => $tank->current_dip_mm]],
    ])->assertOk();

    $rows = Payment::where('shift_id', $shiftId)->where('method', 'mpesa')->get();

    expect($rows)->toHaveCount(2)
        ->and($rows->sum('amount'))->toBe(4000.0)
        ->and($rows->pluck('reference_code')->sort()->values()->all())
        ->toBe(['SJK4H2LM01', 'SJK4H2LM02']);
});

// ── A correction does not invent a stock loss ─────────────────────────

test('re-reconciling keeps the opening volume the shift actually opened on', function () {
    actingAs($this->manager);

    $tank = Tank::first();
    $nozzle = Nozzle::where('tank_id', $tank->id)->firstOrFail();
    $openingVolume = (float) $tank->current_volume;

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');

    postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => ['cash' => 1000],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading + 50,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => $tank->current_dip_mm]],
    ])->assertOk();

    $firstVariance = (float) Shift::find($shiftId)->stock_variance_liters;

    // Approve a correction, which reconciles the shift a second time. The tank
    // has already been moved to its closing volume by now, so reading it again
    // as the opening figure would compute the variance against the wrong
    // baseline and invent a loss the size of the shift's own sales.
    $editRequestId = postJson('/api/v1/edit-requests', [
        'model_type' => Shift::class,
        'model_id' => $shiftId,
        'reason' => 'Dip was read before the delivery settled',
        'requested_data' => [
            'meters' => [[
                'nozzle_id' => $nozzle->id,
                'opening_reading' => (float) $nozzle->fresh()->current_reading - 50,
                'closing_reading' => (float) $nozzle->fresh()->current_reading,
            ]],
        ],
    ])->assertSuccessful()->json('data.id');

    actingAs($this->admin);
    postJson("/api/v1/edit-requests/{$editRequestId}", [
        'status' => 'approved',
        '_method' => 'PUT',
    ])->assertSuccessful();

    $dip = DipReading::withTrashed()
        ->where('shift_id', $shiftId)
        ->whereNotNull('opening_volume_liters')
        ->orderByDesc('created_at')
        ->firstOrFail();

    expect((float) $dip->opening_volume_liters)->toBe($openingVolume)
        ->and((float) Shift::find($shiftId)->stock_variance_liters)->toBe($firstVariance);
});
