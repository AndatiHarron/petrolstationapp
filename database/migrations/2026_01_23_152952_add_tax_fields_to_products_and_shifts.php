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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('vat_rate', 5, 2)->default(16.00)->after('current_price');
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->decimal('total_tax_collected', 15, 2)->default(0)->after('cash_variance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('vat_rate');
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->dropColumn('total_tax_collected');
        });
    }
};
