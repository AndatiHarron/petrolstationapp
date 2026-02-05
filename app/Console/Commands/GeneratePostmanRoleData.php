<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GeneratePostmanRoleData extends Command
{
    protected $signature = 'postman:generate-roles {count=50}';
    protected $description = 'Generate CSV data with fresh Admin and Manager ecosystems for Postman';

    public function handle()
    {
        $count = $this->argument('count');
        $path = base_path('postman_role_data.csv');
        $file = fopen($path, 'w');

        // 1. Define CSV Headers
        fputcsv($file, [
            'role',                // For your reference
            'email',               // Login Email
            'password',            // Login Password
            'station_id',          // A Station belonging to this user
            'tank_id',             // A Tank belonging to this station
            'product_id',          // The product in that tank
            'new_customer_email',  // Unique email for testing Customer creation
            'new_invoice_number',  // Unique invoice for Lifting creation
            'random_volume'        // Random volume for payloads
        ]);

        $bar = $this->output->createProgressBar($count);

        // 2. Generate Independent Rows
        for ($i = 0; $i < $count; $i++) {
            // A. Create a fresh Organization for this specific iteration
            // This guarantees no cross-contamination of data between rows
            $org = Organization::factory()->create(['name' => "Test Org {$i}"]);

            // B. Create a Station & Tank for this Org
            $station = Station::factory()->create(['organization_id' => $org->id]);
            $tank = Tank::factory()->create([
                'organization_id' => $org->id,
                'station_id' => $station->id
            ]);

            // C. Decide Role (Admin vs Manager)
            $isManager = rand(0, 1) === 1;

            if ($isManager) {
                // Manager: Must be assigned to THIS station
                $user = User::factory()->create([
                    'organization_id' => $org->id,
                    'station_id' => $station->id,
                    'email' => "manager_{$i}_" . Str::random(5) . "@test.com",
                    'password' => Hash::make('password')
                ]);
                $user->assignRole('manager');
            } else {
                // Admin: Belongs to Org, can access the station
                $user = User::factory()->create([
                    'organization_id' => $org->id,
                    'email' => "admin_{$i}_" . Str::random(5) . "@test.com",
                    'password' => Hash::make('password')
                ]);
                $user->assignRole('admin');
            }

            // D. Write to CSV
            fputcsv($file, [
                $isManager ? 'manager' : 'admin',
                $user->email,
                'password',
                $station->id,          // Guaranteed valid for this user
                $tank->id,             // Guaranteed valid for this station
                $tank->product_id,     // Valid product
                "cust_{$i}_" . Str::random(5) . "@example.com",
                'INV-' . strtoupper(Str::random(8)),
                rand(500, 5000)
            ]);

            $bar->advance();
        }

        fclose($file);
        $bar->finish();
        $this->newLine();
        $this->info("✅ Generated {$count} completely independent test scenarios at: {$path}");
    }
}
