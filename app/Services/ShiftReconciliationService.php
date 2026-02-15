<?php

namespace App\Services;

use App\Models\CreditSale;
use App\Models\DipReading;
use App\Models\MeterReading;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Tank;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ShiftReconciliationService
{
    public function __construct(protected TaxService $taxService) {}

    /**
     * @throws Throwable
     */
    public function reconcile(Shift $shift, array $meterData, array $dipData, array $payments)
    {
        return DB::transaction(function () use ($shift, $meterData, $dipData, $payments) {
            // Process Meter Readings (Calculate Expected Cash)
            $financials = $this->processMeters($shift, $meterData);

            // Process Payments
            $totalCollected = $this->savePayments($shift, $payments);

            // Process Dip Readings
            $stockResults = $this->processDips($shift, $dipData, $financials['volume_sold_per_tank']);

            $shift->update([
                'status' => 'LOCKED',
                'locked_at' => now(),

                'total_expected_cash' => $financials['total_expected'],
                'total_collected_cash' => $totalCollected,
                'cash_variance' => $totalCollected - $financials['total_expected'],
                'total_tax_collected' => $financials['total_tax'],

                'total_stock_sold_liters' => $financials['total_volume'],
                'stock_variance_liters' => $stockResults['net_variance'],
            ]);

            return $shift;
        });
    }

    protected function processMeters(Shift $shift, array $meters)
    {
        $totalExpected = 0;
        $totalVolume = 0;
        $totalTaxLiability = 0;
        $volumePerTank = [];

        foreach ($meters as $meter) {
            $nozzle = Nozzle::with(['tank.product'])->find($meter['nozzle_id']);

            $opening = (float) ($meter['opening_reading'] ?? $nozzle->current_reading);
            $closing = (float) $meter['closing_reading'];

            $digits = (int) ($nozzle->digits ?? 7);
            $maxLimit = pow(10, $digits);

            if ($opening > $closing) {
                $threshold = $maxLimit * 0.9;

                if ($opening < $threshold) {
                    throw new \Exception(
                        "Error on Nozzle [{$nozzle->name}]: Closing reading ({$closing}) cannot be less than Opening reading ({$opening}). check for typos."
                    );
                }

                $volume = ($maxLimit - $opening) + $closing;
            } else {
                $volume = $closing - $opening;
            }

            $price = (float) $nozzle->tank->product->current_price;
            $value = $volume * $price;

            $vatRate = (float) $nozzle->tank->product->vat_rate;
            $taxComponent = $this->taxService->calculateOutputTax($value, $vatRate);

            $totalTaxLiability += $taxComponent;

            $evidencePath = $meter['evidence_path'] ?? null;
            $evidenceHash = null;

            if ($evidencePath) {
                $fullPath = Storage::disk('public')->path($evidencePath);

                if (file_exists($fullPath)) {
                    $evidenceHash = md5_file($fullPath);

                    $is_duplicate = MeterReading::where('evidence_hash', $evidenceHash)
                        ->where('shift_id', '!=', $shift->id)
                        ->exists();

                    if ($is_duplicate) {
                        throw new \Exception("INTEGRITY ERROR: The photo for {$nozzle->name} has been used in a previous shift. Please take a new photo.");
                    }
                }
            }

            MeterReading::create([
                'id' => (string) Str::uuid(),
                'organization_id' => $shift->organization_id,
                'shift_id' => $shift->id,
                'nozzle_id' => $nozzle->id,
                'opening_reading' => $opening,
                'closing_reading' => $closing,
                'volume_sold' => $volume,
                'price_per_liter' => $price,
                'total_value' => $value,
                'evidence_path' => $evidencePath,
                'evidence_hash' => $evidenceHash,
                'gps_coordinates' => $meter['gps_coordinates'] ?? null,
            ]);

            $nozzle->update([
                'current_reading' => $closing,
            ]);

            $totalExpected += $value;
            $totalVolume += $volume;

            $tankId = $nozzle->tank_id;
            if (! isset($volumePerTank[$tankId])) {
                $volumePerTank[$tankId] = 0;
            }
            $volumePerTank[$tankId] += $volume;
        }

        return [
            'total_expected' => $totalExpected,
            'total_volume' => $totalVolume,
            'total_tax' => $totalTaxLiability,
            'volume_sold_per_tank' => $volumePerTank,
        ];
    }

    protected function processDips(Shift $shift, array $dips, array $salesByTank)
    {
        $netVariance = 0;

        foreach ($dips as $dip) {
            $tank = Tank::findOrFail($dip['tank_id']);

            $currentVolume = $this->calculateTankVolume($tank, $dip['dip_mm']);

            $soldFromTank = $salesByTank[$tank->id] ?? 0;
            $expectedVolume = $tank->current_volume - $soldFromTank;

            $variance = $currentVolume - $expectedVolume;

            DipReading::create([
                'id' => (string) Str::uuid(),
                'organization_id' => $shift->organization_id,
                'shift_id' => $shift->id,
                'tank_id' => $tank->id,
                'dip_mm' => $dip['dip_mm'],
                'volume_liters' => $currentVolume,
            ]);

            $tank->update([
                'current_volume' => $currentVolume,
                'current_dip_mm' => $dip['dip_mm'],
            ]);

            $netVariance += $variance;
        }

        return [
            'net_variance' => $netVariance,
        ];
    }

    protected function savePayments(Shift $shift, array $payments)
    {
        $total = 0;

        $shift->payments()->delete();
        $shift->creditSales()->delete();

        foreach (['cash', 'mpesa'] as $method) {
            if (isset($payments[$method]) && is_numeric($payments[$method]) && $payments[$method] > 0) {
                $shift->payments()->create([
                    'organization_id' => $shift->organization_id,
                    'method' => $method,
                    'amount' => $payments[$method],
                ]);

                $total += $payments[$method];
            }
        }

        if (isset($payments['credit']) && is_array($payments['credit'])) {
            $creditTotal = 0;

            foreach ($payments['credit'] as $creditEntry) {
                if (($creditEntry['amount'] ?? 0) > 0) {
                    CreditSale::create([
                        'organization_id' => $shift->organization_id,
                        'shift_id' => $shift->id,
                        'customer_id' => $creditEntry['customer_id'],
                        'amount' => $creditEntry['amount'],
                        'vehicle_reg' => $creditEntry['vehicle_reg'] ?? null,
                    ]);

                    $creditTotal += $creditEntry['amount'];
                }
            }

            if ($creditTotal > 0) {
                $shift->payments()->create([
                    'organization_id' => $shift->organization_id,
                    'method' => 'credit',
                    'amount' => $creditTotal,
                ]);

                $total += $creditTotal;
            }
        }

        return $total;
    }

    private function calculateVolume(float $open, float $close, int $digits): float
    {
        if ($close >= $open) {
            return $close - $open;
        }

        $maxVal = pow(10, $digits);

        return ($maxVal - $open) + $close;
    }

    private function calculateTankVolume(Tank $tank, float $mm): float
    {
        $chart = $tank->calibration_chart;

        if (empty($chart)) {
            return 0;
        }

        // Force sort by mm asc
        usort($chart, fn ($a, $b) => $a['mm'] <=> $b['mm']);

        // Check bounds
        $minNode = $chart[0];
        $maxNode = end($chart);

        // If dip is BELOW the lowest chart point, it's empty
        if ($mm < $minNode['mm']) {
            return 0;
        }

        // If dip is ABOVE the highest chart point, cap it at Max Capacity
        if ($mm > $maxNode['mm']) {
            return $maxNode['liters'];
        }

        // Linear Interpolation
        for ($i = 0; $i < count($chart) - 1; $i++) {
            $lower = $chart[$i];
            $upper = $chart[$i + 1];

            if ($mm >= $lower['mm'] && $mm <= $upper['mm']) {
                $rangeMm = $upper['mm'] - $lower['mm'];
                $rangeLiters = $upper['liters'] - $lower['liters'];

                // Prevent division by zero
                if ($rangeMm == 0) {
                    return $lower['liters'];
                }

                $ratio = ($mm - $lower['mm']) / $rangeMm;

                return $lower['liters'] + ($ratio * $rangeLiters);
            }
        }

        return $maxNode['liters'];
    }
}
