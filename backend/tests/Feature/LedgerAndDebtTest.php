<?php

use App\Models\CreditSale;
use App\Models\CreditSettlement;
use App\Models\Customer;
use App\Models\LedgerEntry;
use App\Models\Lifting;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Supplier;
use App\Models\Tank;
use App\Models\User;
use App\Services\DebtService;
use App\Services\LedgerService;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $this->manager = User::where('email', 'manager@octane.com')->firstOrFail();
    $this->admin = User::where('email', 'admin@octane.com')->firstOrFail();
});

function lockAShift(array $payments): Shift
{
    $manager = User::where('email', 'manager@octane.com')->firstOrFail();
    actingAs($manager);

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => $payments,
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => $nozzle->current_reading,
            'closing_reading' => $nozzle->current_reading + 100,
        ]],
        'dips' => [[
            'tank_id' => $tank->id,
            'dip_mm' => $tank->current_dip_mm,
        ]],
    ])->assertOk();

    return Shift::findOrFail($shiftId);
}

// ── Double entry ──────────────────────────────────────────────────────

test('a closed shift posts a balanced ledger entry', function () {
    $shift = lockAShift(['cash' => 18000, 'mpesa' => 0]);

    $entry = LedgerEntry::where('source_id', $shift->id)
        ->where('type', LedgerEntry::TYPE_SHIFT_SALE)
        ->firstOrFail();

    expect($entry->isBalanced())->toBeTrue()
        ->and($entry->total_debit)->toBeGreaterThan(0);
});

test('the trial balance balances after a shift and a delivery', function () {
    lockAShift(['cash' => 18000, 'mpesa' => 0]);

    actingAs($this->admin);

    $tank = Tank::first();
    postJson('/api/v1/liftings', [
        'station_id' => $tank->station_id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->toDateString(),
        'volume_liters' => 5000,
        'buying_price_per_liter' => 150,
        'total_cost' => 750000,
        'invoice_number' => 'INV-TB-1',
    ])->assertSuccessful();

    $trial = app(LedgerService::class)->trialBalance($this->admin->organization_id);

    expect($trial['totals']['balanced'])->toBeTrue()
        ->and($trial['totals']['difference'])->toBe(0.0);
});

test('a shortage is posted as a cost, not lost', function () {
    // Expected revenue is 100 litres at the seeded price; hand over less.
    $shift = lockAShift(['cash' => 1000, 'mpesa' => 0]);

    expect((float) $shift->fresh()->cash_variance)->toBeLessThan(0);

    $trial = app(LedgerService::class)->trialBalance($this->manager->organization_id);
    $variance = collect($trial['accounts'])->firstWhere('code', 'CASH_VARIANCE');

    expect($variance)->not->toBeNull()
        ->and($variance['balance'])->toBeGreaterThan(0)
        ->and($trial['totals']['balanced'])->toBeTrue();
});

test('the ledger is closed to anyone but an owner', function () {
    actingAs($this->manager);
    getJson('/api/v1/ledger/trial-balance')->assertForbidden();

    actingAs($this->admin);
    getJson('/api/v1/ledger/trial-balance')->assertOk();
});

// ── A delivery costs the fuel it brings ───────────────────────────────

test('a delivery re-strikes the tank average cost, weighted by volume', function () {
    actingAs($this->admin);

    $tank = Tank::first();
    $tank->update(['current_volume' => 0, 'average_cost_per_liter' => 0]);

    Lifting::create([
        'organization_id' => $tank->organization_id,
        'station_id' => $tank->station_id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->toDateString(),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 100,
        'total_cost' => 100000,
        'tax_paid' => 0,
    ]);

    expect((float) $tank->fresh()->average_cost_per_liter)->toBe(100.0);

    Lifting::create([
        'organization_id' => $tank->organization_id,
        'station_id' => $tank->station_id,
        'tank_id' => $tank->id,
        'lifting_date' => now()->toDateString(),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 200,
        'total_cost' => 200000,
        'tax_paid' => 0,
    ]);

    // Equal volumes at 100 and 200 average to 150 — not 200, which taking the
    // latest price would have given.
    expect((float) $tank->fresh()->average_cost_per_liter)->toBe(150.0);
});

// ── Debt: the defect that inflated balances ───────────────────────────

test('an approved correction does not charge a credit customer twice', function () {
    $customer = Customer::factory()->create([
        'organization_id' => $this->manager->organization_id,
        'current_balance' => 0,
    ]);

    $shift = lockAShift([
        'cash' => 1000,
        'credit' => [['customer_id' => $customer->id, 'amount' => 5000]],
    ]);

    expect((float) $customer->fresh()->current_balance)->toBe(5000.0);

    // The real correction path: a supervisor raises an edit request, an admin
    // approves it, and the shift is reconciled again from the top. That
    // re-reconcile deletes the credit sales and writes them back — which used
    // to leave the customer owing 10,000 for one 5,000 fill, and did so again
    // every time an edit was approved.
    actingAs($this->manager);
    $nozzle = Nozzle::first();

    $editRequestId = postJson('/api/v1/edit-requests', [
        'model_type' => Shift::class,
        'model_id' => $shift->id,
        'reason' => 'Closing reading was keyed in wrong',
        'requested_data' => [
            'meters' => [[
                'nozzle_id' => $nozzle->id,
                'opening_reading' => (float) $nozzle->current_reading - 100,
                'closing_reading' => (float) $nozzle->current_reading + 10,
            ]],
        ],
    ])->assertSuccessful()->json('data.id');

    actingAs($this->admin);
    postJson("/api/v1/edit-requests/{$editRequestId}", [
        'status' => 'approved',
        '_method' => 'PUT',
    ])->assertSuccessful();

    expect((float) $customer->fresh()->current_balance)->toBe(5000.0);
});

// ── Aging by real invoice dates ───────────────────────────────────────

test('aging buckets a debt by the age of the invoice it sits on', function () {
    $customer = Customer::factory()->create([
        'organization_id' => $this->admin->organization_id,
        'current_balance' => 0,
    ]);

    $shift = Shift::factory()->create([
        'organization_id' => $this->admin->organization_id,
        'station_id' => $this->admin->station_id ?? Tank::first()->station_id,
    ]);

    $old = CreditSale::create([
        'organization_id' => $customer->organization_id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 4000,
    ]);
    $old->forceFill(['created_at' => now()->subDays(95)])->saveQuietly();

    CreditSale::create([
        'organization_id' => $customer->organization_id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 1000,
    ]);

    $aging = app(DebtService::class)->agingFor($customer->fresh(), now());

    expect($aging['buckets']['90+'])->toBe(4000.0)
        ->and($aging['buckets']['0-30'])->toBe(1000.0);
});

test('a settlement clears the oldest invoice first', function () {
    $customer = Customer::factory()->create([
        'organization_id' => $this->admin->organization_id,
        'current_balance' => 0,
    ]);

    $shift = Shift::factory()->create([
        'organization_id' => $this->admin->organization_id,
        'station_id' => Tank::first()->station_id,
    ]);

    $old = CreditSale::create([
        'organization_id' => $customer->organization_id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 4000,
    ]);
    $old->forceFill(['created_at' => now()->subDays(95)])->saveQuietly();

    CreditSale::create([
        'organization_id' => $customer->organization_id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 1000,
    ]);

    $settlement = CreditSettlement::create([
        'organization_id' => $customer->organization_id,
        'customer_id' => $customer->id,
        'station_id' => $shift->station_id,
        'amount' => 4000,
        'method' => 'cash',
        'recorded_by_user_id' => $this->manager->id,
        'status' => CreditSettlement::STATUS_PENDING,
    ]);

    $settlement->approve($this->admin);

    $aging = app(DebtService::class)->agingFor($customer->fresh(), now());

    // The old invoice is gone and only the recent one is left — the behaviour
    // the previous newest-first guess got exactly backwards.
    expect($aging['buckets']['90+'])->toBe(0.0)
        ->and($aging['buckets']['0-30'])->toBe(1000.0);
});

test('a settlement posts to the ledger and keeps it balanced', function () {
    $customer = Customer::factory()->create([
        'organization_id' => $this->admin->organization_id,
        'current_balance' => 3000,
    ]);

    $settlement = CreditSettlement::create([
        'organization_id' => $customer->organization_id,
        'customer_id' => $customer->id,
        'amount' => 3000,
        'method' => 'mpesa',
        'recorded_by_user_id' => $this->manager->id,
        'status' => CreditSettlement::STATUS_PENDING,
    ]);

    $settlement->approve($this->admin);

    $entry = LedgerEntry::where('source_id', $settlement->id)->firstOrFail();

    expect($entry->isBalanced())->toBeTrue()
        ->and((float) $customer->fresh()->current_balance)->toBe(0.0);
});

// ── Suppliers ─────────────────────────────────────────────────────────

test('a credit delivery raises a payable in the ledger', function () {
    actingAs($this->admin);

    $tank = Tank::first();
    $supplier = Supplier::factory()->create([
        'organization_id' => $tank->organization_id,
        'current_balance' => 0,
    ]);

    $lifting = Lifting::create([
        'organization_id' => $tank->organization_id,
        'station_id' => $tank->station_id,
        'tank_id' => $tank->id,
        'supplier_id' => $supplier->id,
        'is_credit' => true,
        'lifting_date' => now()->toDateString(),
        'volume_liters' => 1000,
        'buying_price_per_liter' => 150,
        'total_cost' => 150000,
        'tax_paid' => 20689.66,
    ]);

    $entry = LedgerEntry::where('source_id', $lifting->id)->firstOrFail();
    $payable = $entry->lines->first(fn ($line) => $line->account->code === 'AP');

    expect($entry->isBalanced())->toBeTrue()
        ->and((float) $payable->credit)->toBe(150000.0)
        ->and((float) $supplier->fresh()->current_balance)->toBe(150000.0);
});
