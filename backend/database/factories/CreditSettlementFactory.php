<?php

namespace Database\Factories;

use App\Models\CreditSettlement;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CreditSettlement>
 */
class CreditSettlementFactory extends Factory
{
    protected $model = CreditSettlement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $customer = Customer::factory();

        return [
            'customer_id' => $customer,
            'amount' => fake()->randomFloat(2, 100, 5000),
            'method' => fake()->randomElement(CreditSettlement::METHODS),
            'reference' => fake()->optional()->bothify('REF-####'),
            'recorded_by_user_id' => User::factory(),
            'status' => CreditSettlement::STATUS_PENDING,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => CreditSettlement::STATUS_APPROVED,
            'approved_at' => now(),
        ]);
    }
}
