<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The general ledger.
 *
 * Until now Accounts Payable and Receivable were decimal columns on `customers`
 * and `suppliers`, moved by model hooks. That works right up to the first
 * question nobody can answer from it — "why is this balance what it is?" — and
 * it cannot be trial-balanced, so an error has nowhere to show up.
 *
 * This is ordinary double entry. Every financial event writes one `ledger_entry`
 * holding two or more `ledger_lines` whose debits equal their credits. The
 * balance columns stay where they are and stay authoritative for the screens
 * that read them; the ledger is the explanation behind them, and the trial
 * balance is what proves the two agree.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();

            // A stable machine code (CASH, AR, VAT_OUTPUT …) that posting code
            // refers to, so renaming an account for humans never breaks a post.
            $table->string('code');
            $table->string('name');

            // ASSET | LIABILITY | EQUITY | INCOME | EXPENSE
            $table->string('type')->index();

            // Which side increases this account: DEBIT for assets and expenses,
            // CREDIT for liabilities, equity and income.
            $table->string('normal_balance');

            // Set on the accounts the posting rules require, so the chart can be
            // extended by an admin without the required ones being removable.
            $table->boolean('is_system')->default(false);

            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
        });

        Schema::create('ledger_entries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->foreignUuid('station_id')->nullable()->constrained()->nullOnDelete();

            // The business date the entry belongs to, which is not always the
            // date the row was written — a shift keyed in the next morning
            // still belongs to the day it was worked.
            $table->date('entry_date')->index();

            // SHIFT_SALE | LIFTING | CREDIT_SETTLEMENT | SUPPLIER_SETTLEMENT | REVERSAL | ADJUSTMENT
            $table->string('type')->index();
            $table->string('memo')->nullable();

            // What in the operational data caused this entry.
            $table->nullableUuidMorphs('source');

            // A reversal points back at what it reverses, so a corrected shift
            // leaves both the original and its undo visible rather than a gap.
            //
            // The constraint is added separately, below. Laravel turns a fluent
            // ->primary() into a command it appends *after* the foreign keys,
            // and Postgres emits both as ALTER TABLE — so a key pointing at
            // this same table is created before the primary key it references
            // exists, and is rejected. MySQL and SQLite inline the primary key
            // in CREATE TABLE, which is why only Postgres sees it, and why only
            // a self-reference can trigger it.
            $table->uuid('reverses_entry_id')->nullable();

            $table->decimal('total_debit', 15, 2)->default(0);
            $table->decimal('total_credit', 15, 2)->default(0);

            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Now that the table exists and carries its primary key, the
        // self-reference can be pointed at it.
        Schema::table('ledger_entries', function (Blueprint $table): void {
            $table->foreign('reverses_entry_id')
                ->references('id')
                ->on('ledger_entries')
                ->nullOnDelete();

            // Looked up on every post, to check an entry has not already been
            // reversed — a correction applied twice would otherwise credit back
            // money that was only ever debited once.
            $table->index('reverses_entry_id');
        });

        Schema::create('ledger_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->foreignUuid('ledger_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ledger_account_id')->constrained();

            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->string('memo')->nullable();

            // Who the line is against, for a sub-ledger view: the customer whose
            // receivable moved, or the supplier whose payable did.
            $table->nullableUuidMorphs('party');

            $table->timestamps();

            $table->index(['ledger_account_id', 'organization_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_lines');
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('ledger_accounts');
    }
};
