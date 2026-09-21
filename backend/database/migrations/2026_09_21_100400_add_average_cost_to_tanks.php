<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a litre in this tank actually cost.
 *
 * Cost of sales was being taken as "every lifting bought in the period", which
 * is only right if the tanks happen to start and end the period at the same
 * level. It never reads right for a month that opened full and closed empty.
 *
 * A moving weighted average, re-struck on each delivery, lets a shift be costed
 * from what its fuel cost rather than from what was bought that month — and it
 * is the figure a stock loss has to be valued at to mean anything.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tanks', function (Blueprint $table): void {
            if (! Schema::hasColumn('tanks', 'average_cost_per_liter')) {
                $table->decimal('average_cost_per_liter', 10, 4)->default(0)->after('current_volume');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tanks', function (Blueprint $table): void {
            if (Schema::hasColumn('tanks', 'average_cost_per_liter')) {
                $table->dropColumn('average_cost_per_liter');
            }
        });
    }
};
