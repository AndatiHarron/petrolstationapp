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
    public function __construct(
        protected TaxService $taxService,
        protected LedgerService $ledgerService,
    ) {}

    /**
     * @param  bool  $isApprovedCorrection  Set when an admin-approved edit request
     *                                      is being re-applied. Such a correction
     *                                      exists precisely to restate readings,
     *                                      so it is allowed to supply an opening
     *                                      figure that no longer matches the
     *                                      nozzle — which a shift close is not.
     *
     * @throws Throwable
     */
    public function reconcile(Shift $shift, array $meterData, array $dipData, array $payments, bool $isApprovedCorrection = false)
    {
        $shift = DB::transaction(function () use ($shift, $meterData, $dipData, $payments, $isApprovedCorrection) {
            // Process Meter Readings (Calculate Expected Cash)
            $financials = $this->processMeters($shift, $meterData, $isApprovedCorrection);

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

        // Posted after the transaction commits, and never allowed to fail the
        // close. The operational record is what the station depends on minute to
        // minute; the ledger is the accounting view of it, and a bookkeeping
        // problem must not be the reason a supervisor cannot go home.
        $this->postToLedger($shift);

        return $shift;
    }

    /**
     * Mirror a reconciled shift into the general ledger.
     */
    protected function postToLedger(Shift $shift): void
    {
        try {
            $this->ledgerService->postShiftSale($shift->fresh([
                'payments', 'creditSales.customer', 'dipReadings.tank',
            ]));
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    protected function processMeters(Shift $shift, array $meters, bool $isApprovedCorrection = false)
    {
        $totalExpected = 0;
        $totalVolume = 0;
        $totalTaxLiability = 0;
        $volumePerTank = [];

        foreach ($meters as $meter) {
            $nozzle = Nozzle::with(['tank.product'])->find($meter['nozzle_id']);

            $opening = $this->resolveOpeningReading($nozzle, $meter, $isApprovedCorrection);
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
                // Read the bytes through the filesystem rather than resolving a
                // path on disk. ->path() exists only on the local driver, so on
                // object storage the previous version threw — and this check is
                // the duplicate-photo integrity guard, so losing it would let a
                // photo be reused across shifts. md5 of the same bytes gives the
                // same hash md5_file did, so existing hashes still match.
                $disk = Storage::disk();

                if ($disk->exists($evidencePath)) {
                    $evidenceHash = md5($disk->get($evidencePath));

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

    /**
     * The opening reading of a shift has to be the closing reading of the one
     * before it. That unbroken chain is what makes a meter trail worth having:
     * if a shift may open on any figure, litres can be moved between shifts at
     * will and no variance will ever show it.
     *
     * So the stored reading wins, and a submitted figure that disagrees with it
     * is refused rather than silently ignored. The exception is a nozzle that
     * has never been used, where there is nothing to chain to and the figure on
     * the pump establishes the baseline.
     */
    protected function resolveOpeningReading(Nozzle $nozzle, array $meter, bool $isApprovedCorrection = false): float
    {
        $stored = (float) ($nozzle->current_reading ?? 0);
        $submitted = isset($meter['opening_reading']) && $meter['opening_reading'] !== null
            ? (float) $meter['opening_reading']
            : null;

        // An approved edit request is the sanctioned way to restate a reading,
        // reviewed by an admin and recorded in the audit log, so it sets the
        // figure rather than being checked against the current one.
        if ($isApprovedCorrection && $submitted !== null) {
            return $submitted;
        }

        // Nothing recorded yet: whatever is on the pump becomes the baseline.
        if ($stored <= 0) {
            return $submitted ?? 0.0;
        }

        if ($submitted === null) {
            return $stored;
        }

        // A tenth of a litre of slack, because the figure arrives as a decimal
        // string and an exact float comparison would reject equal values.
        if (abs($submitted - $stored) > 0.1) {
            throw new \Exception(
                "INTEGRITY ERROR on Nozzle [{$nozzle->name}]: the opening reading entered ({$submitted}) "
                ."does not match the {$stored} this nozzle closed on at the end of the last shift. "
                .'Re-check the figure on the pump; if the pump really reads differently, an admin must '
                .'correct the nozzle before this shift can be closed.'
            );
        }

        return $stored;
    }

    protected function processDips(Shift $shift, array $dips, array $salesByTank)
    {
        $netVariance = 0;

        foreach ($dips as $dip) {
            $tank = Tank::findOrFail($dip['tank_id']);

            // Without a calibration chart a depth cannot be turned into a
            // volume at all. It used to come back as zero litres, which is
            // indistinguishable from a measured empty tank and produced a
            // variance equal to the whole shift's sales — a loss that was
            // never real. Record the depth, claim no volume, and let the
            // variance stay silent until the chart is entered.
            $canConvert = ! empty($tank->calibration_chart);

            $currentVolume = $canConvert
                ? $this->calculateTankVolume($tank, $dip['dip_mm'])
                : null;

            $openingVolume = $this->resolveOpeningVolume($shift, $tank);

            if (! $canConvert) {
                DipReading::create([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $shift->organization_id,
                    'shift_id' => $shift->id,
                    'tank_id' => $tank->id,
                    'dip_mm' => $dip['dip_mm'],
                    'volume_liters' => null,
                    'opening_volume_liters' => $openingVolume,
                ]);

                // The depth is still worth keeping as the raw observation.
                $tank->update(['current_dip_mm' => $dip['dip_mm']]);

                continue;
            }

            $soldFromTank = $salesByTank[$tank->id] ?? 0;
            $expectedVolume = $openingVolume - $soldFromTank;
            $variance = $currentVolume - $expectedVolume;

            DipReading::create([
                'id' => (string) Str::uuid(),
                'organization_id' => $shift->organization_id,
                'shift_id' => $shift->id,
                'tank_id' => $tank->id,
                'dip_mm' => $dip['dip_mm'],
                'volume_liters' => $currentVolume,
                // Kept so the arithmetic can be re-read later, and so a
                // correction re-runs against the baseline this shift actually
                // opened on rather than against wherever the tank has since got
                // to.
                'opening_volume_liters' => $openingVolume,
                'expected_volume_liters' => $expectedVolume,
                'variance_liters' => $variance,
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

    /**
     * The book stock this shift opened on.
     *
     * On a first close that is simply what is in the tank, which at that moment
     * still holds the opening figure plus anything delivered during the shift.
     *
     * On a correction it must not be: by then the tank has already been moved to
     * its closing volume by the original close, so reading it again would
     * compute the variance against the wrong baseline — and every approved
     * correction would invent a stock loss roughly the size of the shift's own
     * sales. The figure recorded the first time is the one that stays true, so
     * the earlier reading is consulted first, including a soft-deleted one,
     * since a correction deletes the old readings before writing new ones.
     */
    protected function resolveOpeningVolume(Shift $shift, Tank $tank): float
    {
        $previous = DipReading::withTrashed()
            ->where('shift_id', $shift->id)
            ->where('tank_id', $tank->id)
            ->whereNotNull('opening_volume_liters')
            ->orderBy('created_at')
            ->first();

        if ($previous) {
            return (float) $previous->opening_volume_liters;
        }

        return (float) $tank->current_volume;
    }

    /**
     * Record what was collected, and how.
     *
     * M-Pesa arrives one of two ways, because stations work both ways: a single
     * till total for the shift, or the individual transactions with their codes.
     * Both are accepted and both are stored as payment rows, so the reference is
     * on the record rather than in someone's notebook — which is what makes an
     * M-Pesa figure checkable against the statement later.
     */
    protected function savePayments(Shift $shift, array $payments)
    {
        $total = 0;

        // Soft deletes now, so the figures a correction replaced are still
        // readable rather than gone.
        //
        // Deleted one at a time, deliberately. `$relation->delete()` compiles to
        // a single UPDATE and fires no model events — so the hook that takes a
        // credit sale back off the customer's balance never ran, and every
        // approved correction added the shift's credit sales to that customer's
        // debt all over again.
        $shift->payments()->get()->each->delete();
        $shift->creditSales()->get()->each->delete();

        $cash = $this->amountOf($payments['cash'] ?? 0);

        if ($cash > 0) {
            $shift->payments()->create([
                'organization_id' => $shift->organization_id,
                'method' => 'cash',
                'amount' => $cash,
            ]);

            $total += $cash;
        }

        foreach ($this->normaliseMpesa($payments) as $entry) {
            $shift->payments()->create([
                'organization_id' => $shift->organization_id,
                'method' => 'mpesa',
                'amount' => $entry['amount'],
                'reference_code' => $entry['reference_code'],
            ]);

            $total += $entry['amount'];
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

    /**
     * The M-Pesa side of a shift's takings, as a list of {amount, reference}.
     *
     * @return list<array{amount: float, reference_code: string|null}>
     */
    protected function normaliseMpesa(array $payments): array
    {
        $raw = $payments['mpesa'] ?? 0;

        // A list of individual transactions, each with its own code.
        if (is_array($raw)) {
            $entries = [];

            foreach ($raw as $transaction) {
                $amount = $this->amountOf($transaction['amount'] ?? $transaction);

                if ($amount <= 0) {
                    continue;
                }

                $entries[] = [
                    'amount' => $amount,
                    'reference_code' => $this->referenceOf($transaction),
                ];
            }

            return $entries;
        }

        // A single till total, with the till or batch reference beside it.
        $amount = $this->amountOf($raw);

        if ($amount <= 0) {
            return [];
        }

        return [[
            'amount' => $amount,
            'reference_code' => $payments['mpesa_reference']
                ?? $payments['mpesa_reference_code']
                ?? null,
        ]];
    }

    private function amountOf(mixed $value): float
    {
        if (is_array($value)) {
            $value = $value['amount'] ?? 0;
        }

        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function referenceOf(mixed $transaction): ?string
    {
        if (! is_array($transaction)) {
            return null;
        }

        $reference = $transaction['reference_code']
            ?? $transaction['reference']
            ?? $transaction['code']
            ?? null;

        $reference = is_string($reference) ? trim($reference) : null;

        return $reference !== '' ? $reference : null;
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
