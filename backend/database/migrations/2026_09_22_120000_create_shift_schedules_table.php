<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The shifts a station actually runs.
 *
 * A shift has until now been whatever period a supervisor happened to leave
 * open — started when they arrived, closed when they felt like it. That makes
 * two things impossible: comparing like with like across days, and noticing
 * that someone closed an hour early and took the difference.
 *
 * Stations do not agree on how many shifts they run. A busy forecourt might
 * work three, a quiet one two, and a station on a main road might run one long
 * day shift and a short night. So the pattern belongs to the station rather
 * than to the system, and an admin sets it per station.
 *
 * Times are wall-clock at the station — "06:00" means six in the morning there,
 * not six UTC — so the station carries the timezone they are read in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_schedules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->foreignUuid('station_id')->constrained()->cascadeOnDelete();

            $table->string('name');

            // Wall-clock, at the station. An end before a start means the shift
            // runs through midnight, which is the normal shape of a night
            // shift and not an error.
            $table->time('starts_at');
            $table->time('ends_at');

            // What order they are listed in, which is the order they are worked
            // rather than alphabetical or whenever they happened to be added.
            $table->unsignedSmallInteger('position')->default(0);

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->unique(['station_id', 'name']);
            $table->index(['station_id', 'is_active']);
        });

        Schema::table('stations', function (Blueprint $table): void {
            if (! Schema::hasColumn('stations', 'timezone')) {
                // The zone the station's clock is in. Everything is stored in
                // UTC; this is only how a wall-clock time is read back.
                $table->string('timezone')->default('Africa/Nairobi')->after('location');
            }
        });

        Schema::table('shifts', function (Blueprint $table): void {
            if (! Schema::hasColumn('shifts', 'shift_schedule_id')) {
                // Nullable on purpose. Shifts recorded before a station had a
                // pattern, and shifts at a station that has not set one, are
                // still perfectly valid — they simply have no scheduled end.
                $table->foreignUuid('shift_schedule_id')->nullable()->after('station_id')
                    ->constrained('shift_schedules')->nullOnDelete();
            }

            if (! Schema::hasColumn('shifts', 'scheduled_end_at')) {
                // Resolved to a real moment when the shift opens, rather than
                // recomputed later from the pattern — the pattern can be edited
                // afterwards, and a shift should be judged against the hours it
                // was actually worked under.
                $table->timestamp('scheduled_end_at')->nullable()->after('started_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table): void {
            if (Schema::hasColumn('shifts', 'shift_schedule_id')) {
                $table->dropConstrainedForeignId('shift_schedule_id');
            }

            if (Schema::hasColumn('shifts', 'scheduled_end_at')) {
                $table->dropColumn('scheduled_end_at');
            }
        });

        Schema::table('stations', function (Blueprint $table): void {
            if (Schema::hasColumn('stations', 'timezone')) {
                $table->dropColumn('timezone');
            }
        });

        Schema::dropIfExists('shift_schedules');
    }
};
