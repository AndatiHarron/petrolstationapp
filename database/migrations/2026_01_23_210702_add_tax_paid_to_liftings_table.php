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
        Schema::table('liftings', function (Blueprint $table) {
            if (!Schema::hasColumn('liftings', 'tax_paid')) {
                $table->decimal('tax_paid', 15, 2)->default(0)->after('total_cost');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('liftings', function (Blueprint $table) {
            $table->dropColumn('tax_paid');
        });
    }
};
