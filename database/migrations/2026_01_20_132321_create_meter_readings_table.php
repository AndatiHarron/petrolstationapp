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
        Schema::create('meter_readings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->index();
            $table->foreignUuid('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('nozzle_id')->constrained();

            $table->decimal('opening_reading', 14, 2);
            $table->decimal('closing_reading', 14, 2);
            $table->decimal('volume_sold', 12, 2);

            $table->decimal('price_per_liter', 10, 2);
            $table->decimal('total_value', 12, 2);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meter_readings');
    }
};
