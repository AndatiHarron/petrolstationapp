<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A human-readable shift reference in DDMMYYYY-HHMM form.
 *
 * The primary key stays a UUID: it is referenced by meter_readings, dip_readings,
 * payments, credit_sales and invoices, and a timestamp-derived key would collide
 * whenever two stations opened a shift in the same minute. This mirrors how
 * invoices already carry `invoice_number` alongside `id`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            $table->string('shift_number')->nullable()->after('id');
            $table->index('shift_number');
        });

        $this->backfillExistingShifts();
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            $table->dropIndex(['shift_number']);
            $table->dropColumn('shift_number');
        });
    }

    /**
     * Give already-recorded shifts a reference derived from when they started,
     * so no row is left without one.
     */
    private function backfillExistingShifts(): void
    {
        $taken = [];

        DB::table('shifts')
            ->select('id', 'started_at')
            ->orderBy('started_at')
            ->orderBy('id')
            ->each(function (object $shift) use (&$taken): void {
                $base = \Illuminate\Support\Carbon::parse($shift->started_at)->format('dmY-Hi');

                $candidate = $base;
                $suffix = 1;

                while (isset($taken[$candidate])) {
                    $suffix++;
                    $candidate = "{$base}-{$suffix}";
                }

                $taken[$candidate] = true;

                DB::table('shifts')
                    ->where('id', $shift->id)
                    ->update(['shift_number' => $candidate]);
            });
    }
};
