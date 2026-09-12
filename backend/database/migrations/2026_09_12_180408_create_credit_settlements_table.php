<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A customer paying down their credit balance.
 *
 * Recorded by a manager at the station, then approved by an admin. The
 * customer's balance only moves on approval — the whole point is that the
 * person taking the money is not the person who confirms it was received, which
 * is the same separation the shift reconciliation rests on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_settlements', function (Blueprint $table): void {
            $table->uuid('id')->primary();

            $table->uuid('organization_id')->index();
            $table->foreignUuid('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('station_id')->nullable()->constrained()->nullOnDelete();

            $table->decimal('amount', 15, 2);
            $table->string('method');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();

            $table->foreignUuid('recorded_by_user_id')->constrained('users');
            $table->string('status')->default('PENDING')->index();

            $table->foreignUuid('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();

            // The balance at the moment of approval, so a statement can be
            // reconstructed later even if the customer's balance moves on.
            $table->decimal('balance_before', 15, 2)->nullable();
            $table->decimal('balance_after', 15, 2)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_settlements');
    }
};
