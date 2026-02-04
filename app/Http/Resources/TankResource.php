<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TankResource extends JsonResource
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
            'capacity_liters' => (float) $this->capacity_liters,
            'current_volume' => (float) $this->current_volume,
            'current_dip_mm' => (float) $this->current_dip_mm,

            // Return chart as array, or empty array if null
            'calibration_chart' => $this->calibration_chart ?? [],

            // Relationships
            'organization_id' => $this->organization_id,
            'station_id' => $this->station_id,
            'station_name' => $this->station->name ?? null,
            'product_id' => $this->product_id,
            'product_name' => $this->product->name ?? null,

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
