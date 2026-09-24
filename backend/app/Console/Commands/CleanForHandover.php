<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Empty the database for handover, keeping only the platform administrators.
 *
 * Everything a demonstration put in — organizations, stations, shifts, readings,
 * the ledger, the audit trail — goes, so the people taking the system over start
 * on their own figures rather than inheriting somebody else's. What stays is the
 * set of accounts that can let them in, with the passwords those accounts
 * already have, and the roles and permissions every account depends on.
 *
 * This cannot be undone. It takes a backup first and says exactly what it is
 * about to remove, and it refuses outright if it cannot find an administrator to
 * leave behind — a database nobody can sign in to is worse than a full one.
 */
class CleanForHandover extends Command
{
    protected $signature = 'db:clean-for-handover
                            {--force : Do not ask for confirmation}
                            {--skip-backup : Do not snapshot the database first}
                            {--expect= : Refuse unless exactly this many administrators are found}';

    protected $description = 'Empty every table for handover, keeping only the platform administrators and their logins';

    /**
     * Tables that survive.
     *
     * Roles and permissions are not data, they are the vocabulary every
     * authorization check in the system is written against. Wiping them would
     * leave the surviving accounts holding a role that no longer exists.
     *
     * @var list<string>
     */
    private const PRESERVED = [
        'migrations',
        'roles',
        'permissions',
        'role_has_permissions',
    ];

    public function handle(): int
    {
        $admins = User::withoutGlobalScopes()
            ->whereHas('roles', fn ($roles) => $roles->where('name', 'super-admin'))
            ->orderBy('email')
            ->get();

        if ($admins->isEmpty()) {
            $this->error('No super-admin account was found. Refusing to wipe a database nobody could then sign in to.');

            return self::FAILURE;
        }

        $expected = $this->option('expect');

        if ($expected !== null && (int) $expected !== $admins->count()) {
            $this->error("Expected {$expected} super-admin account(s), found {$admins->count()}. Nothing has been changed.");
            $this->newLine();
            $this->line('Found:');
            $admins->each(fn (User $admin) => $this->line("  - {$admin->email}"));

            return self::FAILURE;
        }

        $tables = $this->tablesToEmpty();

        $this->newLine();
        $this->info('Keeping these accounts, with their current passwords:');
        $admins->each(fn (User $admin) => $this->line("  - {$admin->email}  ({$admin->name})"));

        $this->newLine();
        $this->info('Emptying '.count($tables).' tables, including:');
        foreach (['organizations', 'stations', 'shifts', 'meter_readings', 'ledger_entries', 'activity_log', 'users'] as $notable) {
            if (in_array($notable, $tables, true)) {
                $count = DB::table($notable)->count();
                $this->line("  - {$notable} ({$count} rows)");
            }
        }
        $this->line('  - ...and every other table except roles and permissions.');

        $this->newLine();
        $this->warn('This cannot be undone.');

        if (! $this->option('force') && ! $this->confirm('Empty the database now?', false)) {
            $this->line('Nothing has been changed.');

            return self::SUCCESS;
        }

        if (! $this->option('skip-backup')) {
            $this->newLine();
            $this->info('Taking a backup first...');

            if ($this->call('backup:run') !== self::SUCCESS) {
                $this->error('The backup failed, so nothing has been deleted. Re-run with --skip-backup to go ahead anyway.');

                return self::FAILURE;
            }
        }

        // Kept as raw rows rather than models: the point is to put these
        // accounts back exactly as they were, password hash and all, and a
        // model would invite a mutator or an observer to change something.
        $keptUsers = DB::table('users')
            ->whereIn('id', $admins->pluck('id'))
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        $keptRoles = DB::table('model_has_roles')
            ->whereIn('model_id', $admins->pluck('id'))
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        $keptPermissions = DB::table('model_has_permissions')
            ->whereIn('model_id', $admins->pluck('id'))
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        $this->newLine();
        $this->info('Emptying...');

        $this->emptyTables($tables);

        foreach ($keptUsers as $row) {
            // A platform administrator answers to no organization and works no
            // forecourt. Both were pointing at rows that no longer exist.
            $row['organization_id'] = null;
            $row['station_id'] = null;

            DB::table('users')->insert($row);
        }

        if ($keptRoles !== []) {
            DB::table('model_has_roles')->insert($keptRoles);
        }

        if ($keptPermissions !== []) {
            DB::table('model_has_permissions')->insert($keptPermissions);
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->newLine();
        $this->info('Done. '.count($keptUsers).' account(s) kept, everything else removed.');
        $this->line('Those accounts now belong to no organization, which is what a platform administrator is.');

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function tablesToEmpty(): array
    {
        $all = array_map(
            fn (array $table): string => $table['name'],
            Schema::getTables()
        );

        return array_values(array_diff($all, self::PRESERVED));
    }

    /**
     * @param  list<string>  $tables
     */
    private function emptyTables(array $tables): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // One statement, so the order the tables happen to be listed in
            // never matters. CASCADE only reaches the tables being emptied
            // anyway: nothing outside this set points into it.
            $quoted = implode(', ', array_map(fn (string $t): string => '"'.$t.'"', $tables));

            DB::statement("TRUNCATE TABLE {$quoted} RESTART IDENTITY CASCADE");

            return;
        }

        Schema::withoutForeignKeyConstraints(function () use ($tables, $driver): void {
            foreach ($tables as $table) {
                if ($driver === 'sqlite') {
                    DB::table($table)->delete();

                    continue;
                }

                DB::table($table)->truncate();
            }
        });
    }
}
