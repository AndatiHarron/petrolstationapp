<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which settlement paid off which credit sale.
 *
 * The aging report used to guess: it walked a customer's sales newest-first and
 * treated whatever fitted inside the current balance as the unpaid part. For a
 * customer who pays steadily that quietly reports old debt as new, which is the
 * one thing an aging report exists to prevent.
 *
 * Recording the allocation removes the guess. A settlement is applied oldest
 * invoice first, and what is left unallocated on each sale is the real
 * outstanding amount, with a real age.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_allocations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();

            $table->foreignUuid('credit_sale_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('credit_settlement_id')->constrained()->cascadeOnDelete();

            $table->decimal('amount', 15, 2);
            $table->timestamps();

            $table->unique(['credit_sale_id', 'credit_settlement_id']);
        });

        Schema::table('credit_sales', function (Blueprint $table): void {
            if (! Schema::hasColumn('credit_sales', 'settled_amount')) {
                // Denormalised for the common query — how much of this sale is
                // still owed — so the aging report does not have to sum the
                // allocations of every sale of every customer on every load.
                $table->decimal('settled_amount', 15, 2)->default(0)->after('amount');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_allocations');

        Schema::table('credit_sales', function (Blueprint $table): void {
            if (Schema::hasColumn('credit_sales', 'settled_amount')) {
                $table->dropColumn('settled_amount');
            }
        });
    }
};
