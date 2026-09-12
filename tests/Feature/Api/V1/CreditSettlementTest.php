<?php

use App\Models\CreditSettlement;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Station;
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
    $this->station = Station::factory()->for($this->org)->create(['name' => 'Station A']);

    $this->admin = User::factory()->for($this->org)->create(['name' => 'Ada Admin']);
    $this->admin->assignRole('admin');

    $this->manager = User::factory()->for($this->org)->create([
        'name' => 'Moses Manager',
        'station_id' => $this->station->id,
    ]);
    $this->manager->assignRole('manager');

    $this->customer = Customer::factory()->for($this->org)->create([
        'name' => 'Acme Haulage',
        'credit_limit' => 50000,
        'current_balance' => 12000,
    ]);
});

function recordSettlement(array $overrides = [])
{
    return postJson('/api/v1/credit-settlements', array_merge([
        'customer_id' => test()->customer->id,
        'amount' => 5000,
        'method' => 'mpesa',
        'reference' => 'QGR7HT21X',
    ], $overrides));
}

// ─── Recording ────────────────────────────────────────────────────

it('lets a manager record a payment as pending', function () {
    Sanctum::actingAs($this->manager);

    $response = recordSettlement();

    $response->assertStatus(201);
    expect($response->json('data.status'))->toBe(CreditSettlement::STATUS_PENDING);
    expect($response->json('data.amount'))->toEqual(5000.0);
    expect($response->json('data.recorded_by'))->toBe('Moses Manager');
    expect($response->json('data.station_name'))->toBe('Station A');
});

it('does not move the balance when the payment is only recorded', function () {
    Sanctum::actingAs($this->manager);

    recordSettlement()->assertStatus(201);

    expect($this->customer->fresh()->current_balance)->toEqual(12000.0);
});

it('refuses a payment larger than the balance owed', function () {
    Sanctum::actingAs($this->manager);

    recordSettlement(['amount' => 20000])
        ->assertStatus(422)
        ->assertJsonValidationErrors('amount');
});

it('refuses a zero or negative amount', function (float $amount) {
    Sanctum::actingAs($this->manager);

    recordSettlement(['amount' => $amount])
        ->assertStatus(422)
        ->assertJsonValidationErrors('amount');
})->with([0, -100]);

it('refuses an unknown payment method', function () {
    Sanctum::actingAs($this->manager);

    recordSettlement(['method' => 'barter'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('method');
});

it('refuses a customer from another organization', function () {
    Sanctum::actingAs($this->manager);

    $foreign = Customer::factory()->for(Organization::factory()->create())->create([
        'current_balance' => 9000,
    ]);

    recordSettlement(['customer_id' => $foreign->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('customer_id');
});

// ─── Approval ─────────────────────────────────────────────────────

it('clears the balance when an admin approves', function () {
    Sanctum::actingAs($this->manager);
    $id = recordSettlement()->json('data.id');

    Sanctum::actingAs($this->admin);
    $response = postJson("/api/v1/credit-settlements/{$id}/approve");

    $response->assertOk();
    expect($response->json('data.status'))->toBe(CreditSettlement::STATUS_APPROVED);
    expect($response->json('data.approved_by'))->toBe('Ada Admin');
    expect($response->json('data.balance_before'))->toEqual(12000.0);
    expect($response->json('data.balance_after'))->toEqual(7000.0);

    expect($this->customer->fresh()->current_balance)->toEqual(7000.0);
});

it('will not let a manager approve, including their own', function () {
    Sanctum::actingAs($this->manager);
    $id = recordSettlement()->json('data.id');

    postJson("/api/v1/credit-settlements/{$id}/approve")->assertForbidden();

    expect($this->customer->fresh()->current_balance)->toEqual(12000.0);
});

it('applies an approval only once', function () {
    Sanctum::actingAs($this->manager);
    $id = recordSettlement()->json('data.id');

    Sanctum::actingAs($this->admin);
    postJson("/api/v1/credit-settlements/{$id}/approve")->assertOk();

    // A second attempt is refused by the policy, and the balance is untouched.
    postJson("/api/v1/credit-settlements/{$id}/approve")->assertForbidden();

    expect($this->customer->fresh()->current_balance)->toEqual(7000.0);
});

// ─── Rejection ────────────────────────────────────────────────────

it('leaves the balance alone when rejected', function () {
    Sanctum::actingAs($this->manager);
    $id = recordSettlement()->json('data.id');

    Sanctum::actingAs($this->admin);
    $response = postJson("/api/v1/credit-settlements/{$id}/reject", [
        'reason' => 'No M-Pesa message received for this reference.',
    ]);

    $response->assertOk();
    expect($response->json('data.status'))->toBe(CreditSettlement::STATUS_REJECTED);
    expect($response->json('data.rejection_reason'))->toContain('No M-Pesa message');
    expect($this->customer->fresh()->current_balance)->toEqual(12000.0);
});

it('requires a reason for rejection', function () {
    Sanctum::actingAs($this->manager);
    $id = recordSettlement()->json('data.id');

    Sanctum::actingAs($this->admin);
    postJson("/api/v1/credit-settlements/{$id}/reject", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reason');
});

// ─── Listing ──────────────────────────────────────────────────────

it('filters the list by status', function () {
    Sanctum::actingAs($this->manager);
    $first = recordSettlement(['amount' => 1000])->json('data.id');
    recordSettlement(['amount' => 2000]);

    Sanctum::actingAs($this->admin);
    postJson("/api/v1/credit-settlements/{$first}/approve")->assertOk();

    expect(getJson('/api/v1/credit-settlements?status=pending')->json('data'))->toHaveCount(1);
    expect(getJson('/api/v1/credit-settlements?status=approved')->json('data'))->toHaveCount(1);
});

it('shows a manager only their own station', function () {
    $otherStation = Station::factory()->for($this->org)->create();
    $otherManager = User::factory()->for($this->org)->create(['station_id' => $otherStation->id]);
    $otherManager->assignRole('manager');

    Sanctum::actingAs($this->manager);
    recordSettlement(['amount' => 1000])->assertStatus(201);

    Sanctum::actingAs($otherManager);
    expect(getJson('/api/v1/credit-settlements')->json('data'))->toHaveCount(0);

    // The admin sees it regardless of station.
    Sanctum::actingAs($this->admin);
    expect(getJson('/api/v1/credit-settlements')->json('data'))->toHaveCount(1);
});
