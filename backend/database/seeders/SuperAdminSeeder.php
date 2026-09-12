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

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'System Administrator',
                'password' => Hash::make($rawPassword),
                'organization_id' => $org->id,
                'station_id' => null,
                'email_verified_at' => now(),
            ]);

        $user->assignRole($role);

        $this->command->info('--------------------------------------');
        $this->command->info('✅ Super Admin Configured');
        $this->command->info('   Email:    '.$email);

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
