<?php

use App\Filament\Resources\Tanks\Pages\EditTank;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\Testing\TestAction;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    Filament::setCurrentPanel('admin');

    // DevSeeder seeds an admin and a manager but no platform owner, and panel
    // access is granted to an admin of an active organization.
    actingAs(User::where('email', 'admin@octane.com')->firstOrFail());
});

function pasteCalibration(Tank $tank, string $text): void
{
    Livewire::test(EditTank::class, ['record' => $tank->getKey()])
        ->fillForm(['calibration_paste' => $text])
        ->callAction(TestAction::make('convertCalibrationPaste')->schemaComponent('calibrationPaste'))
        ->call('save')
        ->assertHasNoFormErrors();
}

/**
 * The paste box and its button are the only way a hundred-row certificate gets
 * entered in a reasonable time, so the page has to actually render them — a
 * mistyped component or namespace would otherwise only surface in the browser.
 *
 * These assert on the saved record rather than on form state, because a
 * repeater keys its rows by a generated uuid that changes every run.
 */
test('the tank form renders, including the paste box', function () {
    Livewire::test(EditTank::class, ['record' => Tank::first()->getKey()])
        ->assertSuccessful()
        ->assertFormFieldExists('calibration_paste')
        ->assertFormFieldExists('calibration_chart');
});

test('a pasted certificate becomes the chart, tab separated', function () {
    $tank = Tank::first();
    $tank->update(['calibration_chart' => null]);

    pasteCalibration($tank, "10\t145\n20\t298\n30\t460");

    // Compared loosely: the values round-trip through json, so a whole number
    // returns as 10 rather than 10.0. Reconciliation casts to float anyway.
    expect($tank->fresh()->calibration_chart)->toEqual([
        ['mm' => 10, 'liters' => 145],
        ['mm' => 20, 'liters' => 298],
        ['mm' => 30, 'liters' => 460],
    ]);
});

test('a pasted certificate becomes the chart, comma separated', function () {
    $tank = Tank::first();
    $tank->update(['calibration_chart' => null]);

    pasteCalibration($tank, "10,145\n20,298");

    expect($tank->fresh()->calibration_chart)->toEqual([
        ['mm' => 10, 'liters' => 145],
        ['mm' => 20, 'liters' => 298],
    ]);
});

test('a certificate with headings and units still converts', function () {
    $tank = Tank::first();
    $tank->update(['calibration_chart' => null]);

    pasteCalibration($tank, "Dip (mm)   Volume (L)\n----------------------\n10 mm      1,450 L\n20 mm      2,980 L");

    expect($tank->fresh()->calibration_chart)->toEqual([
        ['mm' => 10, 'liters' => 1450],
        ['mm' => 20, 'liters' => 2980],
    ]);
});

test('text with no usable rows leaves the existing chart alone', function () {
    $tank = Tank::first();
    $original = $tank->calibration_chart;

    expect($original)->not->toBeEmpty();

    pasteCalibration($tank, "Tank calibration certificate\nno numbers here");

    expect($tank->fresh()->calibration_chart)->toEqual($original);
});
