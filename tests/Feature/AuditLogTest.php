<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\DipReading;
use App\Models\MeterReading;
use App\Models\Nozzle;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('logs activity for critical models', function (string $modelClass, array $attributes) {
    $attributes['organization_id'] = $this->user->organization_id;

    // Some models might need other relations to be in the same org
    if ($modelClass === CreditSale::class) {
        $attributes['customer_id'] = Customer::factory()->create(['organization_id' => $this->user->organization_id])->id;
        $attributes['shift_id'] = Shift::factory()->create(['organization_id' => $this->user->organization_id])->id;
    }
    if ($modelClass === MeterReading::class) {
        $attributes['shift_id'] = Shift::factory()->create(['organization_id' => $this->user->organization_id])->id;
        $attributes['nozzle_id'] = Nozzle::factory()->create(['organization_id' => $this->user->organization_id])->id;
    }
    if ($modelClass === DipReading::class) {
        $attributes['shift_id'] = Shift::factory()->create(['organization_id' => $this->user->organization_id])->id;
        $attributes['tank_id'] = Tank::factory()->create(['organization_id' => $this->user->organization_id])->id;
    }
    if ($modelClass === Payment::class) {
        $attributes['shift_id'] = Shift::factory()->create(['organization_id' => $this->user->organization_id])->id;
    }
    if ($modelClass === Nozzle::class) {
        $attributes['tank_id'] = Tank::factory()->create(['organization_id' => $this->user->organization_id])->id;
        $attributes['station_id'] = Station::factory()->create(['organization_id' => $this->user->organization_id])->id;
    }
    if ($modelClass === Tank::class) {
        $attributes['station_id'] = Station::factory()->create(['organization_id' => $this->user->organization_id])->id;
    }

    $model = $modelClass::factory()->create($attributes);

    $activity = Activity::where('subject_type', $modelClass)
        ->where('subject_id', $model->id)
        ->first();

    expect($activity)->not->toBeNull()
        ->and($activity->event)->toBe('created');

    $model->update(['updated_at' => now()]); // Trigger update if no other fields change, but better to change a logged field

    // Change a logged field
    $loggedFields = [
        MeterReading::class => ['opening_reading' => 100],
        DipReading::class => ['dip_mm' => 500],
        Payment::class => ['amount' => 1000],
        CreditSale::class => ['amount' => 2000],
        Customer::class => ['name' => 'Updated Name'],
        Tank::class => ['name' => 'Updated Tank'],
        Nozzle::class => ['name' => 'Updated Nozzle'],
        Shift::class => ['status' => Shift::STATUS_LOCKED],
    ];

    if (isset($loggedFields[$modelClass])) {
        $model->update($loggedFields[$modelClass]);

        $updateActivity = Activity::where('subject_type', $modelClass)
            ->where('subject_id', $model->id)
            ->where('event', 'updated')
            ->first();

        expect($updateActivity)->not->toBeNull();
    }
})->with([
    'MeterReading' => [MeterReading::class, []],
    'DipReading' => [DipReading::class, []],
    'Payment' => [Payment::class, []],
    'CreditSale' => [CreditSale::class, []],
    'Customer' => [Customer::class, []],
    'Tank' => [Tank::class, []],
    'Nozzle' => [Nozzle::class, []],
    'Shift' => [Shift::class, ['status' => Shift::STATUS_OPEN]],
]);
