<?php

namespace Database\Seeders;

use App\Models\Nozzle;
use App\Models\Organization;
use App\Models\Product;
use App\Models\Station;
use App\Models\Tank;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $org = Organization::create([
            'id' => str()->uuid(),
            'name' => 'Octane Crop',
            'slug' => 'octane-crop',
            'status' => 'active'
        ]);

        $station = Station::create([
            'id' => str()->uuid(),
            'organization_id' => $org->id,
            'name' => 'Nairobi West Branch',
            'is_active' => true,
        ]);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@octane.com',
            'password' => Hash::make('password'),
            'organization_id' => $org->id,
            'station_id' => null,
        ]);
        $admin->assignRole('admin');

        $manager = User::create([
            'name' => 'Manager User',
            'email' => 'manager@octane.com',
            'password' => Hash::make('password'),
            'organization_id' => $org->id,
            'station_id' => $station->id,
        ]);
        $manager->assignRole('manager');

        $product = Product::create([
            'id' => str()->uuid(),
            'organization_id' => $org->id,
            'name' => 'Premium Petrol',
            'current_price' => 180.00,
            'vat_rate' => 16.00
        ]);

        $tank = Tank::create([
            'id' => str()->uuid(),
            'organization_id' => $org->id,
            'station_id' => $station->id,
            'product_id' => $product->id,
            'name' => 'Underground Tank 1',
            'capacity_liters' => 10000,
            'current_volume' => 10000,
            'calibration_chart' => [
                ['mm' => 0, 'liters' => 0],
                ['mm' => 2000, 'liters' => 10000],
            ]
        ]);

        Nozzle::create([
            'id' => str()->uuid(),
            'organization_id' => $org->id,
            'station_id' => $station->id,
            'tank_id' => $tank->id,
            'name' => 'Pump 1 - Nozzle A',
            'digits' => 7,
            'current_reading' => 5000
        ]);
    }
}
