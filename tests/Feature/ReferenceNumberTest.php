<?php

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->station = Station::factory()->for($this->organization)->create();
    $this->user = User::factory()->for($this->organization)->create([
        'station_id' => $this->station->id,
    ]);
});

function makeShift(Station $station, User $user, ?Carbon $startedAt = null): Shift
{
    return Shift::create([
        'organization_id' => $station->organization_id,
        'station_id' => $station->id,
        'started_by_user_id' => $user->id,
        'started_at' => $startedAt ?? now(),
        'status' => Shift::STATUS_OPEN,
    ]);
}

// ─── Shift number: DDMMYYYY-HHMM ──────────────────────────────────

it('assigns a shift number in DDMMYYYY-HHMM form on create', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 08:19:33'));

    $shift = makeShift($this->station, $this->user);

    expect($shift->shift_number)->toBe('12092026-0819');
});

it('keeps the uuid primary key untouched', function () {
    $shift = makeShift($this->station, $this->user);

    expect($shift->id)
        ->not->toBe($shift->shift_number)
        ->toMatch('/^[0-9a-f-]{32,36}$/i');
});

it('pads single digit days and months', function () {
    Carbon::setTestNow(Carbon::parse('2026-01-05 07:04:00'));

    expect(makeShift($this->station, $this->user)->shift_number)->toBe('05012026-0704');
});

it('suffixes a counter when two shifts open in the same minute', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 08:19:00'));

    $second = Station::factory()->for($this->organization)->create();
    $otherUser = User::factory()->for($this->organization)->create(['station_id' => $second->id]);

    $first = makeShift($this->station, $this->user);
    $clash = makeShift($second, $otherUser);

    expect($first->shift_number)->toBe('12092026-0819');
    expect($clash->shift_number)->toBe('12092026-0819-2');
});

it('does not reuse a soft deleted shift number', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 08:19:00'));

    makeShift($this->station, $this->user)->delete();

    expect(makeShift($this->station, $this->user)->shift_number)->toBe('12092026-0819-2');
});

// ─── Invoice number: DDMMYYYY-NNN ─────────────────────────────────

it('starts the daily invoice sequence at 001', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 10:00:00'));

    expect(Invoice::nextInvoiceNumber())->toBe('12092026-001');
});

it('increments the invoice sequence within a day', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 10:00:00'));

    $shift = makeShift($this->station, $this->user);
    $customer = Customer::factory()->for($this->organization)->create();

    $issued = [];

    for ($i = 0; $i < 3; $i++) {
        $number = Invoice::nextInvoiceNumber();
        $issued[] = $number;

        Invoice::create([
            'organization_id' => $this->organization->id,
            'shift_id' => $shift->id,
            'customer_id' => $customer->id,
            'invoice_number' => $number,
            'total_amount' => 1000,
        ]);
    }

    expect($issued)->toBe(['12092026-001', '12092026-002', '12092026-003']);
});

it('restarts the sequence on a new day', function () {
    $shift = makeShift($this->station, $this->user);
    $customer = Customer::factory()->for($this->organization)->create();

    Carbon::setTestNow(Carbon::parse('2026-09-12 23:50:00'));
    Invoice::create([
        'organization_id' => $this->organization->id,
        'shift_id' => $shift->id,
        'customer_id' => $customer->id,
        'invoice_number' => Invoice::nextInvoiceNumber(),
        'total_amount' => 1000,
    ]);

    Carbon::setTestNow(Carbon::parse('2026-09-13 00:10:00'));

    expect(Invoice::nextInvoiceNumber())->toBe('13092026-001');
});

it('passes 009 to 010 without dropping a place', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 10:00:00'));

    $shift = makeShift($this->station, $this->user);
    $customer = Customer::factory()->for($this->organization)->create();

    foreach (range(1, 9) as $i) {
        Invoice::create([
            'organization_id' => $this->organization->id,
            'shift_id' => $shift->id,
            'customer_id' => $customer->id,
            'invoice_number' => sprintf('12092026-%03d', $i),
            'total_amount' => 1000,
        ]);
    }

    expect(Invoice::nextInvoiceNumber())->toBe('12092026-010');
});

it('numbers a specific date rather than today when one is given', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-12 10:00:00'));

    expect(Invoice::nextInvoiceNumber(Carbon::parse('2026-03-01 12:00:00')))
        ->toBe('01032026-001');
});
