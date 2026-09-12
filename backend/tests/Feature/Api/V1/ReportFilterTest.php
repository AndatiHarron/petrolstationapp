<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Lifting;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->org = Organization::factory()->create();
    $this->stationA = Station::factory()->for($this->org)->create(['name' => 'Station A']);
    $this->stationB = Station::factory()->for($this->org)->create(['name' => 'Station B']);

    $this->admin = User::factory()->for($this->org)->create();
    $this->admin->assignRole('admin');

    Sanctum::actingAs($this->admin);
});

function shiftAt(Station $station, User $user, string $when, array $attributes = []): Shift
{
    return Shift::create(array_merge([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'started_by_user_id' => $user->id,
        'started_at' => Carbon::parse($when),
        'status' => Shift::STATUS_LOCKED,
        'total_expected_cash' => 100000,
        'total_collected_cash' => 100000,
        'cash_variance' => 0,
        'total_tax_collected' => 13793.10,
        'stock_variance_liters' => 0,
    ], $attributes));
}

// ─── Validation ───────────────────────────────────────────────────

it('rejects an end date before the start date', function () {
    getJson('/api/v1/reports/pl?start_date=2026-09-10&end_date=2026-09-01')
        ->assertStatus(422)
        ->assertJsonValidationErrors('end_date');
});

it('rejects a malformed date instead of silently reporting the wrong period', function () {
    getJson('/api/v1/reports/pl?start_date=not-a-date')
        ->assertStatus(422)
        ->assertJsonValidationErrors('start_date');
});

it('rejects a station belonging to another organization', function () {
    $foreign = Station::factory()->for(Organization::factory()->create())->create();

    getJson("/api/v1/reports/pl?station_id={$foreign->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('station_id');
});

it('rejects an out of range day count', function () {
    getJson('/api/v1/reports/variance-trend?days=5000')
        ->assertStatus(422)
        ->assertJsonValidationErrors('days');
});

// ─── Date filtering ───────────────────────────────────────────────

it('filters profit and loss by date range', function () {
    shiftAt($this->stationA, $this->admin, '2026-09-05 08:00:00');
    shiftAt($this->stationA, $this->admin, '2026-11-05 08:00:00');

    $response = getJson('/api/v1/reports/pl?start_date=2026-09-01&end_date=2026-09-30');

    $response->assertOk();
    expect($response->json('data.sales'))->toEqual(100000.0);
    expect($response->json('data.shift_count'))->toBe(1);
    expect($response->json('meta.start_date'))->toBe('2026-09-01');
});

it('includes the whole of the final day', function () {
    shiftAt($this->stationA, $this->admin, '2026-09-30 23:45:00');

    expect(getJson('/api/v1/reports/pl?start_date=2026-09-01&end_date=2026-09-30')->json('data.shift_count'))
        ->toBe(1);
});

// ─── Station filtering ────────────────────────────────────────────

it('filters profit and loss by station', function () {
    shiftAt($this->stationA, $this->admin, '2026-09-05 08:00:00');
    shiftAt($this->stationB, $this->admin, '2026-09-06 08:00:00');

    $all = getJson('/api/v1/reports/pl?start_date=2026-09-01&end_date=2026-09-30');
    expect($all->json('data.shift_count'))->toBe(2);

    $onlyA = getJson("/api/v1/reports/pl?start_date=2026-09-01&end_date=2026-09-30&station_id={$this->stationA->id}");
    expect($onlyA->json('data.shift_count'))->toBe(1);
    expect($onlyA->json('data.sales'))->toEqual(100000.0);
});

it('filters the variance trend by station', function () {
    shiftAt($this->stationA, $this->admin, '2026-09-05 08:00:00', ['cash_variance' => -5000]);
    shiftAt($this->stationB, $this->admin, '2026-09-05 08:00:00', ['cash_variance' => -9000]);

    $onlyB = getJson("/api/v1/reports/variance-trend?start_date=2026-09-01&end_date=2026-09-30&station_id={$this->stationB->id}");

    $onlyB->assertOk();
    expect($onlyB->json('data.0.total_variance'))->toEqual(-9000.0);
    expect($onlyB->json('data.0.shift_count'))->toBe(1);
});

it('filters the tax summary by station', function () {
    shiftAt($this->stationA, $this->admin, '2026-09-05 08:00:00');
    shiftAt($this->stationB, $this->admin, '2026-09-05 08:00:00');

    $onlyA = getJson("/api/v1/reports/tax-summary?start_date=2026-09-01&end_date=2026-09-30&station_id={$this->stationA->id}");

    expect($onlyA->json('data.tax_collected'))->toEqual(13793.1);
});

it('pins a manager to their own station whatever they ask for', function () {
    $manager = User::factory()->for($this->org)->create(['station_id' => $this->stationA->id]);
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    shiftAt($this->stationA, $manager, '2026-09-05 08:00:00');
    shiftAt($this->stationB, $manager, '2026-09-05 08:00:00');

    // No station asked for: still only their own.
    $implicit = getJson('/api/v1/reports/pl?start_date=2026-09-01&end_date=2026-09-30');
    expect($implicit->json('data.shift_count'))->toBe(1);

    // Another station asked for explicitly: refused.
    getJson("/api/v1/reports/pl?station_id={$this->stationB->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('station_id');
});

// ─── Customer filtering ───────────────────────────────────────────

it('filters debt aging to one customer', function () {
    $owing = Customer::factory()->for($this->org)->create(['current_balance' => 5000]);
    Customer::factory()->for($this->org)->create(['current_balance' => 7000]);

    $all = getJson('/api/v1/reports/debt-aging');
    expect($all->json('data'))->toHaveCount(2);

    $one = getJson("/api/v1/reports/debt-aging?customer_id={$owing->id}");
    expect($one->json('data'))->toHaveCount(1);
    expect($one->json('data.0.customer_id'))->toBe($owing->id);
    expect($one->json('meta.total_outstanding'))->toEqual(5000.0);
});

// ─── Customer statement ───────────────────────────────────────────

it('returns a customer statement with opening and closing balances', function () {
    $customer = Customer::factory()->for($this->org)->create(['current_balance' => 9000]);
    $shift = shiftAt($this->stationA, $this->admin, '2026-09-05 08:00:00');

    // Before the window — becomes the opening balance.
    CreditSale::create([
        'organization_id' => $this->org->id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 4000,
        'created_at' => Carbon::parse('2026-08-20 10:00:00'),
        'updated_at' => Carbon::parse('2026-08-20 10:00:00'),
    ]);

    // Inside the window.
    foreach ([2000, 3000] as $amount) {
        CreditSale::create([
            'organization_id' => $this->org->id,
            'shift_id' => $shift->id,
            'customer_id' => $customer->id,
            'amount' => $amount,
            'vehicle_reg' => 'KDA 123A',
            'created_at' => Carbon::parse('2026-09-10 10:00:00'),
            'updated_at' => Carbon::parse('2026-09-10 10:00:00'),
        ]);
    }

    $response = getJson("/api/v1/reports/customers/{$customer->id}/statement?start_date=2026-09-01&end_date=2026-09-30");

    $response->assertOk();
    expect($response->json('data.opening_balance'))->toEqual(4000.0);
    expect($response->json('data.period_charges'))->toEqual(5000.0);
    expect($response->json('data.closing_balance'))->toEqual(9000.0);
    expect($response->json('data.lines'))->toHaveCount(2);
    expect($response->json('data.lines.0.shift_number'))->toBe($shift->shift_number);
    expect($response->json('data.lines.0.station_name'))->toBe('Station A');
    expect($response->json('data.customer.name'))->toBe($customer->name);
});

it('filters a customer statement by station', function () {
    $customer = Customer::factory()->for($this->org)->create(['current_balance' => 3000]);
    $shiftA = shiftAt($this->stationA, $this->admin, '2026-09-05 08:00:00');
    $shiftB = shiftAt($this->stationB, $this->admin, '2026-09-06 08:00:00');

    foreach ([[$shiftA, 1000], [$shiftB, 2000]] as [$shift, $amount]) {
        CreditSale::create([
            'organization_id' => $this->org->id,
            'shift_id' => $shift->id,
            'customer_id' => $customer->id,
            'amount' => $amount,
            'created_at' => Carbon::parse('2026-09-10 10:00:00'),
            'updated_at' => Carbon::parse('2026-09-10 10:00:00'),
        ]);
    }

    $onlyB = getJson("/api/v1/reports/customers/{$customer->id}/statement?start_date=2026-09-01&end_date=2026-09-30&station_id={$this->stationB->id}");

    expect($onlyB->json('data.period_charges'))->toEqual(2000.0);
    expect($onlyB->json('data.lines'))->toHaveCount(1);
});

// ─── Liftings are dated by delivery date, not row creation ────────

it('dates costs by the lifting date rather than when the row was entered', function () {
    $tank = Tank::factory()->for($this->org)->for($this->stationA)->create();

    Lifting::factory()->create([
        'organization_id' => $this->org->id,
        'station_id' => $this->stationA->id,
        'tank_id' => $tank->id,
        'lifting_date' => '2026-09-15',
        'total_cost' => 50000,
        'tax_paid' => 6896.55,
        // Entered a month late.
        'created_at' => Carbon::parse('2026-10-20 09:00:00'),
    ]);

    $september = getJson('/api/v1/reports/pl?start_date=2026-09-01&end_date=2026-09-30');

    expect($september->json('data.costs'))->toEqual(50000.0);
    expect($september->json('data.lifting_count'))->toBe(1);
});
