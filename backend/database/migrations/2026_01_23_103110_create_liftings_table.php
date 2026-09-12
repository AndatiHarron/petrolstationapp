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
        Schema::create('liftings', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('station_id')->constrained();
            $table->foreignUuid('tank_id')->constrained();

            $table->date('lifting_date');
            $table->string('invoice_number')->nullable();

            $table->decimal('volume_liters', 12 ,2);
            $table->decimal('buying_price_per_liter', 10 ,2);
            $table->decimal('total_cost', 15, 2);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liftings');
    }
};
