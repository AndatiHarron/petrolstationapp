<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
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
            'method' => 'Cash',
            'amount' => 100.00,
            'reference_code' => $this->faker->unique()->bothify('PAY-#####'),
        ];
    }
}
