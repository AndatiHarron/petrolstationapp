<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LiftingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lifting_date' => $this->lifting_date->format('Y-m-d'),
            'invoice_number' => $this->invoice_number,
            'volume_liters' => (float) $this->volume_liters,
            'buying_price_per_liter' => (float) $this->buying_price_per_liter,
            'total_cost' => (float) $this->total_cost,
            'tax_paid' => (float) ($this->tax_paid ?? 0),

            // Relationships
            'station_name' => $this->station->name ?? 'Unknown',
            'tank_name' => $this->tank->name ?? 'Unknown',
            'product_name' => $this->tank->product->name ?? 'Unknown',

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
