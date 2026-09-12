<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Station;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Shift>
 */
class ShiftFactory extends Factory
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
            'started_by_user_id' => User::factory(),
            'started_at' => now(),
            'status' => 'OPEN',
            'total_collected_cash' => 0,
            'total_expected_cash' => 0,
            'cash_variance' => 0,
            'total_stock_sold_liters' => 0,
            'stock_variance_liters' => 0,
        ];
    }
}
