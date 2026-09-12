<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Station;
use App\Models\Tank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Nozzle>
 */
class NozzleFactory extends Factory
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
            'station_id' => Station::factory(),
            'tank_id' => Tank::factory(),
            'name' => 'Pump ' . $this->faker->randomDigit,
            'current_reading' => 10000
        ];
    }
}
