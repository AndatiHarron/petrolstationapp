<?php

namespace Database\Factories;

use App\Models\Nozzle;
use App\Models\Organization;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MeterReading>
 */
class MeterReadingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'shift_id' => Shift::factory(),
            'nozzle_id' => Nozzle::factory(),
            'opening_reading' => 1000.00,
            'closing_reading' => 1100.00,
            'volume_sold' => 100.00,
            'price_per_liter' => 1.50,
            'total_value' => 150.00,
        ];
    }
}
