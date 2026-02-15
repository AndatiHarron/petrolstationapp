<?php

use App\Services\TaxService;

it('calculates output tax correctly', function (float $value, float $vatRate, float $expected) {
    $taxService = new TaxService;
    expect($taxService->calculateOutputTax($value, $vatRate))->toBe($expected);
})->with([
    [100.0, 16.0, 13.79], // 100 - (100 / 1.16) = 13.7931... rounded to 13.79
    [100.0, 0.0, 0.0],
    [0.0, 16.0, 0.0],
    [1160.0, 16.0, 160.0],
]);

it('calculates input tax correctly', function (float $totalCost, float $vatRate, float $expected) {
    $taxService = new TaxService;
    expect($taxService->calculateInputTax($totalCost, $vatRate))->toBe($expected);
})->with([
    [100.0, 16.0, 13.79],
    [100.0, 0.0, 0.0],
    [0.0, 16.0, 0.0],
    [1160.0, 16.0, 160.0],
]);
