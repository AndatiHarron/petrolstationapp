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
        Schema::table('meter_readings', function (Blueprint $table) {
            // Stores the MD5 hash of the uploaded image to prevent reuse
            $table->string('evidence_hash', 64)->nullable()->index();

            // Stores the GPS coordinates of where the photo was taken
            // JSON format: {"lat": -1.2921, "lng": 36.8219, "accuracy": 10}
            $table->json('gps_coordinates')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meter_readings', function (Blueprint $table) {
            $table->dropColumn(['evidence_hash', 'gps_coordinates']);
        });
    }
};
