<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Remove a tenant and everything that belonged to it.
 *
 * The API refuses to delete an organization that still holds users, stations or
 * shifts, and it is right to: an owner clearing out a tenant by accident would
 * take a year of readings with it. But somebody has to be able to, and "set it
 * to inactive instead" is not an answer when the tenant was a demonstration and
 * the system is being handed over.
 *
 * So this exists, out of reach of the panel, taking the organization by name,
 * saying exactly what it is about to remove, and doing it inside a transaction
 * so a half-deleted tenant is not one of the possible outcomes.
 */
class DeleteOrganization extends Command
{
    protected $signature = 'org:delete
                            {name* : The organization name, or its id}
                            {--force : Do not ask for confirmation}
                            {--skip-backup : Do not snapshot the database first}';

    protected $description = 'Delete an organization and all of its data';

    /**
     * Children before parents.
     *
     * Every one of these carries an organization_id, so membership is never in
     * doubt; what the order settles is the foreign keys between them. Users come
     * before stations because a user points at a station, and after shifts
     * because a shift points at the user who opened it.
     *
     * @var list<string>
     */
    private const ORDER = [
        'credit_allocations',
        'credit_settlements',
        'payments',
        'invoices',
        'credit_sales',
        'customers',
        'meter_readings',
        'dip_readings',
        'edit_requests',
        'shifts',
        'shift_schedules',
        'liftings',
        'supplier_settlements',
        'suppliers',
        'ledger_lines',
        'ledger_entries',
        'ledger_accounts',
        'products',
        'support_requests',
        'agreement_acceptances',
        'idempotency_keys',
        'nozzles',
        'tanks',
        'users',
        'stations',
    ];

    public function handle(): int
    {
        $organizations = $this->resolve($this->argument('name'));

        if ($organizations === null) {
            return self::FAILURE;
        }

        foreach ($organizations as $organization) {
            $this->newLine();
            $this->info("{$organization->name}  ({$organization->id})");

            foreach (self::ORDER as $table) {
                $count = DB::table($table)->where('organization_id', $organization->id)->count();

                if ($count > 0) {
                    $this->line("  {$table}: {$count}");
                }
            }
        }

        $this->newLine();
        $this->warn('This cannot be undone.');

        if (! $this->option('force') && ! $this->confirm('Delete '.$organizations->count().' organization(s) and everything above?', false)) {
            $this->line('Nothing has been changed.');

            return self::SUCCESS;
        }

        if (! $this->option('skip-backup')) {
            $this->info('Taking a backup first...');

            if ($this->call('backup:run') !== self::SUCCESS) {
                $this->error('The backup failed, so nothing has been deleted. Re-run with --skip-backup to go ahead anyway.');

                return self::FAILURE;
            }
        }

        foreach ($organizations as $organization) {
            $this->deleteOne($organization);
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->newLine();
        $this->info('Done.');

        return self::SUCCESS;
    }

    /**
     * @param  list<string>  $names
     * @return Collection<int, Organization>|null
     */
    private function resolve(array $names): ?Collection
    {
        $found = collect();
        $missing = [];

        foreach ($names as $name) {
            $organization = Organization::withoutGlobalScopes()
                ->where('id', $name)
                ->orWhereRaw('LOWER(name) = ?', [mb_strtolower(trim($name))])
                ->first();

            if (! $organization) {
                $missing[] = $name;

                continue;
            }

            $found->push($organization);
        }

        if ($missing !== []) {
            $this->error('No organization matched: '.implode(', ', $missing));
            $this->newLine();
            $this->line('The organizations that exist are:');

            Organization::withoutGlobalScopes()
                ->orderBy('name')
                ->get()
                ->each(fn (Organization $o) => $this->line("  - {$o->name}"));

            return null;
        }

        return $found->unique('id')->values();
    }

    private function deleteOne(Organization $organization): void
    {
        DB::transaction(function () use ($organization): void {
            // A platform administrator is not a member of a tenant, whatever
            // their record happens to say. Deleting one because they were
            // parked in this organization is how a system ends up with nobody
            // who can sign in to it.
            $keptAdmins = User::withoutGlobalScopes()
                ->where('organization_id', $organization->id)
                ->whereHas('roles', fn ($roles) => $roles->where('name', 'super-admin'))
                ->get();

            foreach ($keptAdmins as $admin) {
                $admin->forceFill(['organization_id' => null, 'station_id' => null])->save();

                $this->line("  kept {$admin->email} (platform administrator, now belongs to no organization)");
            }

            $userIds = User::withoutGlobalScopes()
                ->where('organization_id', $organization->id)
                ->pluck('id');

            foreach (self::ORDER as $table) {
                DB::table($table)->where('organization_id', $organization->id)->delete();
            }

            // The audit trail names people who no longer exist. Written by a
            // package, so it carries no organization_id of its own.
            if ($userIds->isNotEmpty()) {
                DB::table('activity_log')->whereIn('causer_id', $userIds)->delete();
            }

            $organization->delete();

            $this->line("  removed {$organization->name}");
        });
    }
}
