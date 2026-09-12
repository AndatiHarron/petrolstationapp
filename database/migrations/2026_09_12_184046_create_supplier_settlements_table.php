<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paying a supplier down, recorded by one person and approved by another.
 *
 * Mirrors credit_settlements. A credit lifting raises what the station owes a
 * supplier; this is how that comes back down, and the balance only moves once
 * an admin confirms the payment actually went out.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_settlements', function (Blueprint $table): void {
            $table->uuid('id')->primary();

            $table->uuid('organization_id')->index();
            $table->foreignUuid('supplier_id')->constrained()->cascadeOnDelete();
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

            $table->decimal('balance_before', 15, 2)->nullable();
            $table->decimal('balance_after', 15, 2)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_settlements');
    }
};
