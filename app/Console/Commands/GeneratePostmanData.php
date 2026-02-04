<?php

namespace App\Console\Commands;

use App\Models\Station;
use Illuminate\Console\Command;

class GeneratePostmanData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'postman:generate-liftings {count=100}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a CSV file for Postman Performance Testing';

    /**
     * Execute the console command.
     */

    public function handle()
    {
        $count = $this->argument('count');
        $stations = Station::with('tanks')->get();

        if ($stations->isEmpty()) {
            $this->error('No stations found. Run seeders first.');
            return;
        }

        // Output path
        $path = base_path('postman_liftings_data.csv');
        $file = fopen($path, 'w');

        // 1. Write CSV Headers (Must match Postman variable names)
        fputcsv($file, [
            'station_id',
            'tank_id',
            'lifting_date',
            'invoice_number',
            'volume_liters',
            'buying_price_per_liter',
            'total_cost',
            'tax_paid'
        ]);

        $bar = $this->output->createProgressBar($count);

        for ($i = 0; $i < $count; $i++) {
            // 2. Logic: Pick a random station that actually HAS tanks
            $station = $stations->where('tanks', '!=', [])->random();

            if (!$station->tanks->count()) continue;

            // 3. Logic: Pick a valid Tank for that Station
            $tank = $station->tanks->random();

            $volume = rand(1000, 5000);
            $price = rand(140, 180);

            fputcsv($file, [
                $station->id,
                $tank->id,
                now()->subDays(rand(0, 30))->format('Y-m-d'),
                'INV-' . strtoupper(uniqid()),
                $volume,
                $price,
                $volume * $price, // Total Cost calculation
                rand(0, 500)      // Tax
            ]);

            $bar->advance();
        }

        fclose($file);
        $bar->finish();

        $this->newLine();
        $this->info("✅ Generated {$count} records at: {$path}");
    }
}
