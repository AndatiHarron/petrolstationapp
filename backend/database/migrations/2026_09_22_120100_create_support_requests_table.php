<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Somebody asking for help from the sign-in screen.
 *
 * Recorded as well as emailed, deliberately. The person raising it cannot get
 * into the system — that is the whole reason they are asking — so if the mail
 * fails, bounces, or lands in a folder nobody reads, there is otherwise nothing
 * anywhere to say they ever asked. The row is the durable part; the email is
 * the notification.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();

            $table->string('email');
            $table->text('message')->nullable();

            // Whoever it turned out to be, where the address matches an
            // account. Resolved at the time so a later rename cannot detach it.
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('organization_id')->nullable()->index();

            // Kept for rate limiting and for spotting a flood from one source.
            $table->string('ip_address', 45)->nullable();

            $table->boolean('notified')->default(false);
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index(['email', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_requests');
    }
};
