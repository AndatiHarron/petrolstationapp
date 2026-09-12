<?php

namespace Database\Factories;

use App\Models\Supplier;
use App\Models\SupplierSettlement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupplierSettlement>
 */
class SupplierSettlementFactory extends Factory
{
    protected $model = SupplierSettlement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => Supplier::factory(),
            'amount' => fake()->randomFloat(2, 1000, 50000),
            'method' => fake()->randomElement(SupplierSettlement::METHODS),
            'reference' => fake()->optional()->bothify('PAY-####'),
            'recorded_by_user_id' => User::factory(),
            'status' => SupplierSettlement::STATUS_PENDING,
        ];
    }
}
