<?php

use App\Models\CreditSettlement;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Station;
use App\Models\Supplier;
use App\Models\SupplierSettlement;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->org = Organization::factory()->create();
    $this->station = Station::factory()->for($this->org)->create();

    $this->admin = User::factory()->for($this->org)->create(['name' => 'Ada Admin']);
    $this->admin->assignRole('admin');

    $this->manager = User::factory()->for($this->org)->create([
        'name' => 'Moses Manager',
        'station_id' => $this->station->id,
    ]);
    $this->manager->assignRole('manager');

    $this->supplier = Supplier::factory()->for($this->org)->create([
        'name' => 'Rubis Depot',
        'current_balance' => 800000,
    ]);
});

function paySupplier(array $overrides = [])
{
    return postJson('/api/v1/supplier-settlements', array_merge([
        'supplier_id' => test()->supplier->id,
        'amount' => 300000,
        'method' => 'bank',
        'reference' => 'FT26091200123',
    ], $overrides));
}

// ─── Recording ────────────────────────────────────────────────────

it('records a supplier payment as pending without moving the balance', function () {
    Sanctum::actingAs($this->manager);

    $response = paySupplier();

    $response->assertStatus(201);
    expect($response->json('data.status'))->toBe(SupplierSettlement::STATUS_PENDING);
    expect($response->json('data.supplier_name'))->toBe('Rubis Depot');
    expect($this->supplier->fresh()->current_balance)->toEqual(800000.0);
});

it('refuses paying more than is owed to the supplier', function () {
    Sanctum::actingAs($this->manager);

    paySupplier(['amount' => 900000])
        ->assertStatus(422)
        ->assertJsonValidationErrors('amount');
});

it('refuses a supplier from another organization', function () {
    Sanctum::actingAs($this->manager);

    $foreign = Supplier::factory()->for(Organization::factory()->create())->create([
        'current_balance' => 50000,
    ]);

    paySupplier(['supplier_id' => $foreign->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('supplier_id');
});

// ─── Approval ─────────────────────────────────────────────────────

it('reduces what is owed when an admin approves', function () {
    Sanctum::actingAs($this->manager);
    $id = paySupplier()->json('data.id');

    Sanctum::actingAs($this->admin);
    $response = postJson("/api/v1/supplier-settlements/{$id}/approve");

    $response->assertOk();
    expect($response->json('data.status'))->toBe(SupplierSettlement::STATUS_APPROVED);
    expect($response->json('data.approved_by'))->toBe('Ada Admin');
    expect($response->json('data.balance_before'))->toEqual(800000.0);
    expect($response->json('data.balance_after'))->toEqual(500000.0);

    expect($this->supplier->fresh()->current_balance)->toEqual(500000.0);
});

it('will not let a manager approve a supplier payment', function () {
    Sanctum::actingAs($this->manager);
    $id = paySupplier()->json('data.id');

    postJson("/api/v1/supplier-settlements/{$id}/approve")->assertForbidden();

    expect($this->supplier->fresh()->current_balance)->toEqual(800000.0);
});

it('applies a supplier approval only once', function () {
    Sanctum::actingAs($this->manager);
    $id = paySupplier()->json('data.id');

    Sanctum::actingAs($this->admin);
    postJson("/api/v1/supplier-settlements/{$id}/approve")->assertOk();
    postJson("/api/v1/supplier-settlements/{$id}/approve")->assertForbidden();

    expect($this->supplier->fresh()->current_balance)->toEqual(500000.0);
});

it('leaves the supplier balance alone when rejected', function () {
    Sanctum::actingAs($this->manager);
    $id = paySupplier()->json('data.id');

    Sanctum::actingAs($this->admin);
    postJson("/api/v1/supplier-settlements/{$id}/reject", [
        'reason' => 'No bank confirmation for this reference.',
    ])->assertOk();

    expect($this->supplier->fresh()->current_balance)->toEqual(800000.0);
});

it('filters supplier payments by status', function () {
    Sanctum::actingAs($this->manager);
    $first = paySupplier(['amount' => 100000])->json('data.id');
    paySupplier(['amount' => 200000]);

    Sanctum::actingAs($this->admin);
    postJson("/api/v1/supplier-settlements/{$first}/approve")->assertOk();

    expect(getJson('/api/v1/supplier-settlements?status=pending')->json('data'))->toHaveCount(1);
    expect(getJson('/api/v1/supplier-settlements?status=approved')->json('data'))->toHaveCount(1);
});

// ─── Approvals summary ────────────────────────────────────────────

it('counts everything awaiting an admin', function () {
    $customer = Customer::factory()->for($this->org)->create(['current_balance' => 20000]);

    Sanctum::actingAs($this->manager);
    paySupplier(['amount' => 100000])->assertStatus(201);
    postJson('/api/v1/credit-settlements', [
        'customer_id' => $customer->id,
        'amount' => 5000,
        'method' => 'cash',
    ])->assertStatus(201);

    Sanctum::actingAs($this->admin);
    $response = getJson('/api/v1/approvals/summary');

    $response->assertOk();
    expect($response->json('data.can_approve'))->toBeTrue();
    expect($response->json('data.total'))->toBe(2);

    $queues = collect($response->json('data.queues'))->keyBy('key');
    expect($queues['credit_payments']['count'])->toBe(1);
    expect($queues['supplier_payments']['count'])->toBe(1);
    expect($queues['edit_requests']['count'])->toBe(0);
});

it('reports nothing to approve for a manager', function () {
    Sanctum::actingAs($this->manager);
    paySupplier(['amount' => 100000])->assertStatus(201);

    $response = getJson('/api/v1/approvals/summary');

    $response->assertOk();
    expect($response->json('data.can_approve'))->toBeFalse();
    expect($response->json('data.total'))->toBe(0);
    expect($response->json('data.queues'))->toBe([]);
});

it('drops the count once the payment is approved', function () {
    Sanctum::actingAs($this->manager);
    $id = paySupplier(['amount' => 100000])->json('data.id');

    Sanctum::actingAs($this->admin);
    expect(getJson('/api/v1/approvals/summary')->json('data.total'))->toBe(1);

    postJson("/api/v1/supplier-settlements/{$id}/approve")->assertOk();

    expect(getJson('/api/v1/approvals/summary')->json('data.total'))->toBe(0);
});

// ─── The shared trait must behave identically for both ────────────

it('records the balance trail the same way for customers and suppliers', function () {
    $customer = Customer::factory()->for($this->org)->create(['current_balance' => 10000]);

    Sanctum::actingAs($this->manager);
    $creditId = postJson('/api/v1/credit-settlements', [
        'customer_id' => $customer->id,
        'amount' => 4000,
        'method' => 'cash',
    ])->json('data.id');
    $supplierId = paySupplier(['amount' => 300000])->json('data.id');

    Sanctum::actingAs($this->admin);
    $credit = postJson("/api/v1/credit-settlements/{$creditId}/approve")->json('data');
    $supplier = postJson("/api/v1/supplier-settlements/{$supplierId}/approve")->json('data');

    expect($credit['balance_before'] - $credit['balance_after'])->toEqual(4000.0);
    expect($supplier['balance_before'] - $supplier['balance_after'])->toEqual(300000.0);

    expect(CreditSettlement::find($creditId)->status)->toBe(CreditSettlement::STATUS_APPROVED);
    expect(SupplierSettlement::find($supplierId)->status)->toBe(SupplierSettlement::STATUS_APPROVED);
});
