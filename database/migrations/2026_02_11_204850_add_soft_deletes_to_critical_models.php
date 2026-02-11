<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add soft deletes to critical tables
        Schema::table('shifts', function (Blueprint $table) {
            if (! Schema::hasColumn('shifts', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('meter_readings', function (Blueprint $table) {
            if (! Schema::hasColumn('meter_readings', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('dip_readings', function (Blueprint $table) {
            if (! Schema::hasColumn('dip_readings', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('credit_sales', function (Blueprint $table) {
            if (! Schema::hasColumn('credit_sales', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('liftings', function (Blueprint $table) {
            if (! Schema::hasColumn('liftings', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('customers', function (Blueprint $table) {
            if (! Schema::hasColumn('customers', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            if (Schema::hasColumn('shifts', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('meter_readings', function (Blueprint $table) {
            if (Schema::hasColumn('meter_readings', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('dip_readings', function (Blueprint $table) {
            if (Schema::hasColumn('dip_readings', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('credit_sales', function (Blueprint $table) {
            if (Schema::hasColumn('credit_sales', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('liftings', function (Blueprint $table) {
            if (Schema::hasColumn('liftings', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
