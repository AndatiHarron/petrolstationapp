<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two integrity gaps closed.
 *
 * `payments` was the one money table still hard-deleted: re-reconciling a shift
 * after an approved correction wiped the original rows with nothing left behind,
 * in a system whose first promise is that nothing is ever deleted.
 *
 * `dip_readings` gains the figures the variance was computed from. Without them
 * a re-reconcile read the tank's *current* volume as the shift's opening volume
 * — but the tank had already been moved to its closing volume by the first
 * reconcile, so the correction computed a variance against the wrong baseline
 * and made a corrected shift look like a loss.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            if (! Schema::hasColumn('payments', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('dip_readings', function (Blueprint $table): void {
            if (! Schema::hasColumn('dip_readings', 'opening_volume_liters')) {
                // The book stock this shift opened on. Captured once, on the
                // first reconcile, and reused by every later correction.
                $table->decimal('opening_volume_liters', 12, 2)->nullable()->after('volume_liters');
            }

            if (! Schema::hasColumn('dip_readings', 'expected_volume_liters')) {
                $table->decimal('expected_volume_liters', 12, 2)->nullable()->after('opening_volume_liters');
            }

            if (! Schema::hasColumn('dip_readings', 'variance_liters')) {
                $table->decimal('variance_liters', 12, 2)->nullable()->after('expected_volume_liters');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            if (Schema::hasColumn('payments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('dip_readings', function (Blueprint $table): void {
            foreach (['opening_volume_liters', 'expected_volume_liters', 'variance_liters'] as $column) {
                if (Schema::hasColumn('dip_readings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
