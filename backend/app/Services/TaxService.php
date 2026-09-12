<?php

namespace App\Services;

class TaxService
{
    /**
     * Calculate VAT collected on sales (Tax inclusive).
     */
    public function calculateOutputTax(float $value, float $vatRate): float
    {
        if ($vatRate <= 0) {
            return 0.0;
        }

        $rawTax = $value - ($value / (1 + ($vatRate / 100)));

        return round($rawTax, 2);
    }

    /**
     * Calculate VAT paid on liftings (Tax inclusive).
     */
    public function calculateInputTax(float $totalCost, float $vatRate): float
    {
        if ($vatRate <= 0) {
            return 0.0;
        }

        $rawTax = $totalCost - ($totalCost / (1 + ($vatRate / 100)));

        return round($rawTax, 2);
    }
}
