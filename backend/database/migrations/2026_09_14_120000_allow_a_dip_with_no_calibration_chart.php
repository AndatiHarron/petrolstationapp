<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A dip is a depth in millimetres. Turning it into litres needs the tank's
     * calibration chart, and a tank may not have one yet. The column could not
     * hold "not known", so an unconvertible dip was stored as zero litres —
     * which then read as a real measurement of an empty tank and produced a
     * stock variance equal to everything sold that shift.
     */
    public function up(): void
    {
        Schema::table('dip_readings', function (Blueprint $table) {
            $table->decimal('volume_liters', 12, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('dip_readings', function (Blueprint $table) {
            $table->decimal('volume_liters', 12, 2)->nullable(false)->change();
        });
    }
};
