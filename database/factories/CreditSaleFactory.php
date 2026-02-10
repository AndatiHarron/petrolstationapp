<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Organization;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CreditSale>
 */
class CreditSaleFactory extends Factory
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
            'customer_id' => Customer::factory(),
            'amount' => $this->faker->randomFloat(2, 50, 5000),
            'vehicle_reg' => $this->faker->bothify('K?? ####'),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }
}
