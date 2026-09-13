<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = config('services.super_admin.email');
        $configuredPassword = config('services.super_admin.password');
        $rawPassword = $configuredPassword ?? Str::random(16);

        $org = Organization::firstOrCreate(
            ['name' => 'Octane Hq'],
            [
                'slug' => 'octane-hq',
                'status' => 'active',
            ]
        );

        $role = Role::firstOrCreate([
            'name' => 'super-admin',
            'guard_name' => 'web',
        ]);

        $existing = User::withoutGlobalScopes()->where('email', $email)->first();

        // The password is set only when the account is created. This runs on
        // every deploy, and resetting the password each time would undo any
        // change made since — silently locking the owner out of their own
        // system with a value from an old environment variable.
        $user = $existing ?? new User(['email' => $email]);

        $user->fill([
            'name' => $existing?->name ?? 'System Administrator',
            'organization_id' => $org->id,
            'station_id' => null,
            'email_verified_at' => $existing?->email_verified_at ?? now(),
        ]);

        if (! $existing) {
            $user->password = Hash::make($rawPassword);
        }

        $user->save();
        $user->assignRole($role);

        $this->command->info('--------------------------------------');
        $this->command->info($existing ? '✅ Super Admin Present' : '✅ Super Admin Created');
        $this->command->info('   Email:    '.$email);

        if ($existing) {
            $this->command->info('   Password: [unchanged]');
            $this->command->info('--------------------------------------');

            return;
        }

        // Read from config, not env(): once `config:cache` has run — which it does on
        // every deploy — env() returns null, and this branch would print the real
        // configured password into the deployment log.
        if ($configuredPassword === null) {
            $this->command->warn('   Password: '.$rawPassword.' (Generated Randomly - SAVE THIS!)');
        } else {
            $this->command->info('   Password: [Hidden] (Set via Environment Variable)');
        }
        $this->command->info('--------------------------------------');
    }
}
