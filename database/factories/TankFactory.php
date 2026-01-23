<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Product;
use App\Models\Station;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tank>
 */
class TankFactory extends Factory
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
            'product_id' => Product::factory(),
            'name' => 'Tank ' . $this->faker->randomDigit,
            'capacity_liters' => 20000,
            'current_volume' => 5000
        ];
    }
}
