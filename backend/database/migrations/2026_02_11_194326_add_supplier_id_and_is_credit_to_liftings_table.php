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
            $table->foreignUuid('supplier_id')->nullable()->after('supplier_name')->constrained('suppliers')->nullOnDelete();
            $table->boolean('is_credit')->default(false)->after('total_cost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('liftings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supplier_id');
            $table->dropColumn('is_credit');
        });
    }
};
