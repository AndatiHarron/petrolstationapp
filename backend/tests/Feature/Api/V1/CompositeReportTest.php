<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->org = Organization::factory()->create(['name' => 'Test Fuels Ltd']);
    $this->stationA = Station::factory()->for($this->org)->create(['name' => 'Station A']);
    $this->stationB = Station::factory()->for($this->org)->create(['name' => 'Station B']);

    $this->alice = User::factory()->for($this->org)->create(['name' => 'Alice']);
    $this->bob = User::factory()->for($this->org)->create(['name' => 'Bob']);
    $this->alice->assignRole('admin');

    Sanctum::actingAs($this->alice);
});

function makeShiftFor(Station $station, User $user, string $when, array $overrides = []): Shift
{
    return Shift::create(array_merge([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'started_by_user_id' => $user->id,
        'started_at' => Carbon::parse($when),
        'locked_at' => Carbon::parse($when)->addHours(8),
        'status' => Shift::STATUS_LOCKED,
        'total_stock_sold_liters' => 500,
        'total_expected_cash' => 90000,
        'total_collected_cash' => 80000,
        'cash_variance' => -10000,
        'stock_variance_liters' => 0,
        'total_tax_collected' => 12413.79,
    ], $overrides));
}

// ─── End of day ───────────────────────────────────────────────────

it('combines every shift on one calendar day', function () {
    makeShiftFor($this->stationA, $this->alice, '2026-09-12 06:00:00');
    makeShiftFor($this->stationA, $this->bob, '2026-09-12 14:00:00');
    // Different day: must be excluded.
    makeShiftFor($this->stationA, $this->alice, '2026-09-13 06:00:00');

    $response = getJson('/api/v1/reports/end-of-day?date=2026-09-12');

    $response->assertOk();
    expect($response->json('data.totals.shift_count'))->toBe(2);
    expect($response->json('data.totals.liters_sold'))->toEqual(1000.0);
    expect($response->json('data.totals.expected_cash'))->toEqual(180000.0);
    expect($response->json('data.totals.cash_variance'))->toEqual(-20000.0);
    expect($response->json('data.shifts'))->toHaveCount(2);
    expect($response->json('data.date'))->toBe('2026-09-12');
});

it('covers a full 24 hours including shifts either end of the day', function () {
    makeShiftFor($this->stationA, $this->alice, '2026-09-12 00:01:00');
    makeShiftFor($this->stationA, $this->bob, '2026-09-12 23:58:00');

    expect(getJson('/api/v1/reports/end-of-day?date=2026-09-12')->json('data.totals.shift_count'))
        ->toBe(2);
});

it('names the attendant and shift number on each line', function () {
    $shift = makeShiftFor($this->stationA, $this->bob, '2026-09-12 06:00:00');

    $response = getJson('/api/v1/reports/end-of-day?date=2026-09-12');

    expect($response->json('data.shifts.0.attendant'))->toBe('Bob');
    expect($response->json('data.shifts.0.shift_number'))->toBe($shift->shift_number);
    expect($response->json('data.shifts.0.station_name'))->toBe('Station A');
});

it('splits end of day money by payment method', function () {
    $shift = makeShiftFor($this->stationA, $this->alice, '2026-09-12 06:00:00');

    foreach ([['cash', 50000], ['mpesa', 30000]] as [$method, $amount]) {
        Payment::create([
            'organization_id' => $this->org->id,
            'shift_id' => $shift->id,
            'method' => $method,
            'amount' => $amount,
        ]);
    }

    $response = getJson('/api/v1/reports/end-of-day?date=2026-09-12');

    expect($response->json('data.payments.cash'))->toEqual(50000.0);
    expect($response->json('data.payments.mpesa'))->toEqual(30000.0);
    expect($response->json('data.payments.credit'))->toEqual(0.0);
});

it('filters end of day by station', function () {
    makeShiftFor($this->stationA, $this->alice, '2026-09-12 06:00:00');
    makeShiftFor($this->stationB, $this->bob, '2026-09-12 06:00:00');

    $response = getJson("/api/v1/reports/end-of-day?date=2026-09-12&station_id={$this->stationA->id}");

    expect($response->json('data.totals.shift_count'))->toBe(1);
    expect($response->json('data.station'))->toBe('Station A');
});

// ─── Monthly ──────────────────────────────────────────────────────

it('rolls a month up with a daily series', function () {
    makeShiftFor($this->stationA, $this->alice, '2026-09-05 06:00:00');
    makeShiftFor($this->stationA, $this->alice, '2026-09-05 14:00:00');
    makeShiftFor($this->stationA, $this->bob, '2026-09-20 06:00:00');
    // Next month: excluded.
    makeShiftFor($this->stationA, $this->alice, '2026-10-01 06:00:00');

    $response = getJson('/api/v1/reports/monthly?month=9&year=2026');

    $response->assertOk();
    expect($response->json('data.month'))->toBe('September 2026');
    expect($response->json('data.totals.shift_count'))->toBe(3);
    expect($response->json('data.days_traded'))->toBe(2);
    expect($response->json('data.daily'))->toHaveCount(2);
    expect($response->json('data.daily.0.shift_count'))->toBe(2);
});

// ─── Credit ───────────────────────────────────────────────────────

it('reports credit per customer with utilisation', function () {
    $shift = makeShiftFor($this->stationA, $this->alice, '2026-09-12 06:00:00');

    $customer = Customer::factory()->for($this->org)->create([
        'name' => 'Acme Haulage',
        'credit_limit' => 10000,
        'current_balance' => 9000,
    ]);

    CreditSale::create([
        'organization_id' => $this->org->id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'amount' => 4000,
        'created_at' => Carbon::parse('2026-09-12 10:00:00'),
        'updated_at' => Carbon::parse('2026-09-12 10:00:00'),
    ]);

    $response = getJson('/api/v1/reports/credit?start_date=2026-09-01&end_date=2026-09-30');

    $response->assertOk();
    expect($response->json('data.customers.0.customer_name'))->toBe('Acme Haulage');
    expect($response->json('data.customers.0.period_charges'))->toEqual(4000.0);

    // CreditSale::created increments the customer's balance, so recording a
    // 4,000 sale against a 9,000 balance takes them to 13,000 - past the
    // 10,000 limit, with no credit left.
    expect($response->json('data.customers.0.current_balance'))->toEqual(13000.0);
    expect($response->json('data.customers.0.available_credit'))->toEqual(0.0);
    expect($response->json('data.customers.0.utilisation_pct'))->toEqual(130.0);
    expect($response->json('data.customers.0.over_limit'))->toBeTrue();
});

it('flags a customer over their credit limit', function () {
    Customer::factory()->for($this->org)->create([
        'credit_limit' => 5000,
        'current_balance' => 7500,
    ]);

    $response = getJson('/api/v1/reports/credit?start_date=2026-09-01&end_date=2026-09-30');

    expect($response->json('data.customers.0.over_limit'))->toBeTrue();
    expect($response->json('data.totals.over_limit_count'))->toBe(1);
});

it('leaves out customers with no activity and nothing owing', function () {
    Customer::factory()->for($this->org)->create(['current_balance' => 0, 'credit_limit' => 5000]);

    expect(getJson('/api/v1/reports/credit?start_date=2026-09-01&end_date=2026-09-30')->json('data.customers'))
        ->toHaveCount(0);
});

// ─── Users ────────────────────────────────────────────────────────

it('groups performance by attendant, worst variance first', function () {
    // Bob is worse: two bad shifts to Alice's one.
    makeShiftFor($this->stationA, $this->alice, '2026-09-05 06:00:00', ['cash_variance' => -1000]);
    makeShiftFor($this->stationA, $this->bob, '2026-09-06 06:00:00', ['cash_variance' => -9000]);
    makeShiftFor($this->stationA, $this->bob, '2026-09-07 06:00:00', ['cash_variance' => -9000]);

    $response = getJson('/api/v1/reports/users?start_date=2026-09-01&end_date=2026-09-30');

    $response->assertOk();
    expect($response->json('data.users.0.user_name'))->toBe('Bob');
    expect($response->json('data.users.0.shift_count'))->toBe(2);
    expect($response->json('data.users.0.cash_variance'))->toEqual(-18000.0);
    expect($response->json('data.users.0.avg_variance_per_shift'))->toEqual(-9000.0);
    expect($response->json('data.users.1.user_name'))->toBe('Alice');
    expect($response->json('data.totals.user_count'))->toBe(2);
});

it('filters the user report to one attendant', function () {
    makeShiftFor($this->stationA, $this->alice, '2026-09-05 06:00:00');
    makeShiftFor($this->stationA, $this->bob, '2026-09-06 06:00:00');

    $response = getJson("/api/v1/reports/users?start_date=2026-09-01&end_date=2026-09-30&user_id={$this->bob->id}");

    expect($response->json('data.users'))->toHaveCount(1);
    expect($response->json('data.users.0.user_name'))->toBe('Bob');
});

it('rejects a user from another organization', function () {
    $foreign = User::factory()->for(Organization::factory()->create())->create();

    getJson("/api/v1/reports/users?user_id={$foreign->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('user_id');
});

// ─── VAT ──────────────────────────────────────────────────────────

it('reports output against input vat with a monthly series', function () {
    makeShiftFor($this->stationA, $this->alice, '2026-09-05 06:00:00', ['total_tax_collected' => 12000]);
    makeShiftFor($this->stationA, $this->alice, '2026-10-05 06:00:00', ['total_tax_collected' => 8000]);

    $response = getJson('/api/v1/reports/vat?start_date=2026-09-01&end_date=2026-10-31');

    $response->assertOk();
    expect($response->json('data.totals.tax_collected'))->toEqual(20000.0);
    expect($response->json('data.totals.net_tax'))->toEqual(20000.0);
    expect($response->json('data.totals.payable'))->toBeTrue();
    expect($response->json('data.periods'))->toHaveCount(2);
    expect($response->json('data.periods.0.label'))->toBe('Sep 2026');
    expect($response->json('data.periods.0.tax_collected'))->toEqual(12000.0);
});

// ─── PDF delivery ─────────────────────────────────────────────────

it('returns a pdf for every composite report', function (string $path) {
    makeShiftFor($this->stationA, $this->alice, '2026-09-12 06:00:00');

    $response = getJson("/api/v1/reports/{$path}");

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect($response->getContent())->toStartWith('%PDF');
})->with([
    'end of day' => 'end-of-day?date=2026-09-12&format=pdf',
    'monthly' => 'monthly?month=9&year=2026&format=pdf',
    'credit' => 'credit?start_date=2026-09-01&end_date=2026-09-30&format=pdf',
    'users' => 'users?start_date=2026-09-01&end_date=2026-09-30&format=pdf',
    'vat' => 'vat?start_date=2026-09-01&end_date=2026-09-30&format=pdf',
]);

it('rejects an unknown output format', function () {
    getJson('/api/v1/reports/vat?format=xlsx')
        ->assertStatus(422)
        ->assertJsonValidationErrors('format');
});

it('still returns json when no format is asked for', function () {
    getJson('/api/v1/reports/vat')
        ->assertOk()
        ->assertHeader('content-type', 'application/json');
});
