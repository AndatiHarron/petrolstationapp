<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A shift that reached its end with nobody there to close it.
 *
 * Until now such a shift stayed OPEN indefinitely: the supervisor went home,
 * the record sat there, and the station could not start the next one. Closing
 * it automatically is better, but only if it is honest about what it does and
 * does not know — nothing may be invented, so it is closed with no readings at
 * all and marked as still owing them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            if (! Schema::hasColumn('shifts', 'auto_closed_at')) {
                // Set only when the system closed it rather than a person, so
                // the difference is visible on the record and in a report
                // rather than inferred from a missing reading.
                $table->timestamp('auto_closed_at')->nullable()->after('locked_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            if (Schema::hasColumn('shifts', 'auto_closed_at')) {
                $table->dropColumn('auto_closed_at');
            }
        });
    }
};
