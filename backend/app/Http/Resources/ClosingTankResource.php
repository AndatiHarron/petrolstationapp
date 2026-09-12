<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClosingTankResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'tank_id' => $this->resource['tank']->id,
            'tank_name' => $this->resource['tank']->name,
            'product_name' => $this->resource['tank']->product->name ?? 'Unknown',
            'opening_volume' => (float) $this->resource['opening_volume'],
            'capacity' => (float) $this->resource['tank']->capacity_liters,
        ];
    }
}
