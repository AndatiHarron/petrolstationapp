<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Shift;
use App\Models\Tank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DipReading>
 */
class DipReadingFactory extends Factory
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
            'tank_id' => Tank::factory(),
            'dip_mm' => 100.00,
            'volume_liters' => 500.00,
        ];
    }
}
