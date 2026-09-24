<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A shift that opened because its hours began, not because somebody said so.
 *
 * Which means it has nobody who started it until the supervisor on the
 * forecourt takes it, so the column that has always named that person has to be
 * allowed to be empty for the first few minutes of such a shift's life.
 *
 * The nullability is changed with explicit SQL on Postgres rather than through
 * `->change()`. The container runs migrations on boot and stops on the first
 * failure, so a statement whose exact form is known beats one generated from a
 * column definition restated by hand — the latter has to get the type, the
 * default and the foreign key right all over again to leave things as they were.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            if (! Schema::hasColumn('shifts', 'auto_started_at')) {
                $table->timestamp('auto_started_at')->nullable()->after('started_at');
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE shifts ALTER COLUMN started_by_user_id DROP NOT NULL');

            return;
        }

        Schema::table('shifts', function (Blueprint $table): void {
            $table->uuid('started_by_user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            if (Schema::hasColumn('shifts', 'auto_started_at')) {
                $table->dropColumn('auto_started_at');
            }
        });

        // The column is deliberately left nullable: any shift opened
        // automatically and never claimed would have no value to put back.
    }
};
