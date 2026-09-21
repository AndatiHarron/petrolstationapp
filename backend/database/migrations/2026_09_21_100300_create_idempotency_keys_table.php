<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What makes the offline queue safe to replay.
 *
 * A station with no signal now holds its writes on the device and sends them
 * when the connection returns. The failure that matters is not the request that
 * fails — it is the one that *succeeded* and whose response never arrived, which
 * the device will retry. Without a guard that retry closes the same shift twice
 * or books the same credit sale against a customer again.
 *
 * The client sends a key it generates once per intended action and reuses for
 * every retry of it. The first request to arrive does the work and its response
 * is stored; every later request carrying that key is handed the stored
 * response instead of doing the work again.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable()->index();
            $table->foreignUuid('user_id')->nullable()->constrained()->cascadeOnDelete();

            // Scoped to the user: two devices must never collide on a key, and a
            // key from a signed-out session must not resolve for the next one.
            $table->string('key');
            $table->string('method');
            $table->string('path');

            // A hash of the payload. The same key arriving with a different body
            // is a client bug, not a retry, and is refused rather than silently
            // answered with the wrong stored response.
            $table->string('request_hash');

            $table->unsignedSmallInteger('response_status')->nullable();
            $table->longText('response_body')->nullable();

            // PROCESSING while the first request is still in flight, so a retry
            // that overlaps it is told to wait rather than starting a second run.
            $table->string('status')->default('PROCESSING');

            $table->timestamps();

            $table->unique(['user_id', 'key']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
