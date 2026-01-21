<?php

namespace App\Services;

use App\Models\MeterReading;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Tank;
use Illuminate\Support\Facades\DB;
use Throwable;

class ShiftReconciliationService
{
    /**
     * @throws Throwable
     */
    public function reconcile(Shift $shift, array $meterData, array $dipData, float $cashCollected)
    {
        return DB::transaction(function () use ($shift, $meterData, $dipData, $cashCollected) {
           $totalRevenue = 0;
           $totalLitersSold = 0;

          foreach ($meterData as $reading) {
              $nozzle = Nozzle::findOrFail($reading['nozzle_id']);

              $volume = $this->calculateVolume(
                  $reading['opening_reading'],
                  $reading['closing_reading'],
                  $nozzle->digits
              );

              $price = $nozzle->tank->product->current_price;
              $value = $volume * $price;

              MeterReading::create([
                  'shift_id' => $shift->id,
                  'nozzle_id' => $nozzle->id,
                  'opening_reading' => $reading['opening_reading'],
                  'closing_reading' => $reading['closing_reading'],
                  'volume_sold' => $volume,
                  'price_per_liter' => $price,
                  'total_value' => $value,
              ]);

              $totalRevenue += $value;
              $totalLitersSold += $volume;
          }

          $totalStockDiff = 0;

          foreach ($dipData as $dip) {
              $tank = Tank::findOrFail($dip['tank_id']);

              $physicalVolume = $this->calculateTankVolume($tank, $dip['dip_mm']);

              $expectedVolume = $tank->current_volume - $totalLitersSold;
              $variance = $physicalVolume - $expectedVolume;

              $tank->update([
                  'current_volume' => $physicalVolume,
                  'current_dip_mm' => $dip['dip_mm'],
              ]);

              $totalStockDiff += $variance;
          }

              $shift->update([
                  'status' => 'LOCKED',
                  'locked_at' => now(),
                  'total_expected_cash' => $totalRevenue,
                  'total_collected_cash' => $cashCollected,
                  'cash_variance' => $cashCollected - $totalRevenue,
                  'total_stock_sold_liters' => $totalLitersSold,
                  'stock_variance_liters' => $totalStockDiff
              ]);

          return $shift;
        });
    }

    private function calculateVolume(float $open, float $close, int $digits): float
    {
        if ($close >= $open) {
            return $close - $open;
        }

        $maxVal = pow(10, $digits);
        return ($maxVal - $open) + $close;
    }

    private function calculateTankVolume(Tank $tank, float $dipMm) : float {
        if (empty($tank->calibration_chart)) {
            return 0;
        }

        $chart = collect($tank->calibration_chart)->sortBy('mm')->values();

        $lower = $chart->where('mm', '<=', $dipMm)->last();
        $upper = $chart->where('mm', '>=', $dipMm)->first();

        if(!$lower) {
            return 0;
        }

        if (!$upper || $lower['mm'] === $upper['mm']) {
            return $lower['liters'];
        }

        // CORE MATH: Linear Interpolation Formula
        // Y = Y1 + (X - X1) * ((Y2 - Y1) / (X2 - X1))
        $slope = ($upper['liters'] - $lower['liters']) / ($upper['mm'] - $lower['mm']);
        $interpolatedVolume = $lower['liters'] + ($dipMm - $lower['mm']) * $slope;

        return round($interpolatedVolume, 2);
    }
}
