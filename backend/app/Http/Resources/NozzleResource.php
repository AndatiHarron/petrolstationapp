<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NozzleResource extends JsonResource
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
            'name' => $this->name,
            'digits' => (int) $this->digits,
            'current_reading' => (float) $this->current_reading,

            // Relationships
            'organization_id' => $this->organization_id,
            'station_id' => $this->station_id,
            'station_name' => $this->station->name ?? null,
            'tank_id' => $this->tank_id,
            'tank_name' => $this->tank->name ?? null,
            'product_name' => $this->tank->product->name ?? null, // Helpful for UI labels

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
