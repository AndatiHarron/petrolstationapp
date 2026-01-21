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
        Schema::create('shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->index();
            $table->foreignUuid('station_id')->constrained();
            $table->foreignUuid('started_by_user_id')->constrained('users');
            $table->foreignUuid('locked_by_user_id')->nullable()->constrained('users');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('locked_at')->nullable();
            $table->string('status')->default('OPEN')->index();
            $table->decimal('total_collected_cash', 12, 2)->default(0);
            $table->decimal('total_expected_cash', 12, 2)->default(0);
            $table->decimal('cash_variance', 12, 2)->default(0);
            $table->decimal('total_stock_sold_liters', 12, 2)->default(0);
            $table->decimal('stock_variance_liters', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
