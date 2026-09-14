<?php

use App\Support\CalibrationChart;

test('it reads a certificate pasted from a spreadsheet', function () {
    $rows = CalibrationChart::parse("10\t145\n20\t298\n30\t460");

    expect($rows)->toBe([
        ['mm' => 10.0, 'liters' => 145.0],
        ['mm' => 20.0, 'liters' => 298.0],
        ['mm' => 30.0, 'liters' => 460.0],
    ]);
});

test('it reads commas, spaces and tabs alike', function () {
    foreach (["10,145\n20,298", "10 145\n20 298", "10\t145\n20\t298", "10  ,  145\n20;298"] as $text) {
        expect(CalibrationChart::parse($text))->toBe([
            ['mm' => 10.0, 'liters' => 145.0],
            ['mm' => 20.0, 'liters' => 298.0],
        ], "failed on: ".json_encode($text));
    }
});

test('it ignores headings, units and blank lines', function () {
    $pasted = <<<'TXT'
    Tank calibration certificate
    Dip (mm) | Volume (L)
    ---------------------

    10 mm      145 L
    20 mm      298 L

    TXT;

    expect(CalibrationChart::parse($pasted))->toBe([
        ['mm' => 10.0, 'liters' => 145.0],
        ['mm' => 20.0, 'liters' => 298.0],
    ]);
});

test('it handles thousands separators without turning them into decimals', function () {
    // 1,250 is twelve hundred and fifty litres, not one and a quarter. The
    // column boundary has to be firmer than a single space for a space-grouped
    // figure to be readable, which is what a real paste gives you.
    expect(CalibrationChart::parse("100\t1,250\n200\t2,500"))->toBe([
        ['mm' => 100.0, 'liters' => 1250.0],
        ['mm' => 200.0, 'liters' => 2500.0],
    ]);

    expect(CalibrationChart::parse("100    1 250\n200    2 500"))->toBe([
        ['mm' => 100.0, 'liters' => 1250.0],
        ['mm' => 200.0, 'liters' => 2500.0],
    ]);

    // A single space between the columns and a comma inside the volume.
    expect(CalibrationChart::parse('100 1,250'))->toBe([
        ['mm' => 100.0, 'liters' => 1250.0],
    ]);
});

test('it keeps decimal depths', function () {
    expect(CalibrationChart::parse('12.5, 180.25'))->toBe([
        ['mm' => 12.5, 'liters' => 180.25],
    ]);
});

test('it sorts by depth however the rows arrive', function () {
    $rows = CalibrationChart::parse("30 460\n10 145\n20 298");

    expect(array_column($rows, 'mm'))->toBe([10.0, 20.0, 30.0]);
});

test('a repeated depth is corrected rather than duplicated', function () {
    // Someone pastes a revised row underneath the original.
    $rows = CalibrationChart::parse("10 145\n20 298\n10 150");

    expect($rows)->toBe([
        ['mm' => 10.0, 'liters' => 150.0],
        ['mm' => 20.0, 'liters' => 298.0],
    ]);
});

test('it returns nothing for text that holds no pairs', function () {
    foreach ([null, '', '   ', "Dip chart\nfor tank 3", "10\n20\n30"] as $text) {
        expect(CalibrationChart::parse($text))->toBe([]);
    }
});

test('the rows it produces satisfy the tank validation rules', function () {
    $rows = CalibrationChart::parse("10 145\n20 298");

    $validator = Illuminate\Support\Facades\Validator::make(
        ['calibration_chart' => $rows],
        (new App\Http\Requests\StoreTankRequest)->rules()
    );

    expect($validator->errors()->get('calibration_chart.*'))->toBe([])
        ->and($validator->errors()->get('calibration_chart.0.mm'))->toBe([])
        ->and($validator->errors()->get('calibration_chart.0.liters'))->toBe([]);
});
