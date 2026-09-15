<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every decision an administrator makes about the terms, kept as its own
     * row rather than a flag on the user.
     *
     * A flag would answer "has this person agreed" and nothing else. What a
     * dispute needs is which version they agreed to, when, from where, and
     * whether they ever declined first — so each decision is appended and
     * nothing is overwritten. The row is the evidence.
     */
    public function up(): void
    {
        Schema::create('agreement_acceptances', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Kept if the user is later deleted: the fact that a person
            // accepted is evidence about the past and does not stop being
            // true when their account goes.
            $table->uuid('user_id')->nullable();
            $table->string('user_email');
            $table->uuid('organization_id')->nullable();

            $table->string('version');
            $table->string('action');          // accepted | declined
            $table->timestamp('decided_at');

            // Where from, so the record can be placed.
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'version']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agreement_acceptances');
    }
};
