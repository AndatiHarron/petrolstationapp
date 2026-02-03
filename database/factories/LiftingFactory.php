<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Station;
use App\Models\Tank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Lifting>
 */
class LiftingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Smart Factory: Automatically links everything correctly
            'organization_id' => Organization::factory(),
            'station_id' => function (array $attributes) {
                return Station::factory()->create(['organization_id' => $attributes['organization_id']])->id;
            },
            'tank_id' => function (array $attributes) {
                return Tank::factory()->create([
                    'station_id' => $attributes['station_id'],
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'lifting_date' => now(),
            'invoice_number' => $this->faker->bothify('INV-#####'),
            'volume_liters' => 5000,
            'buying_price_per_liter' => 150.00,
            'total_cost' => 750000,
            'tax_paid' => 0,
        ];
    }
}
