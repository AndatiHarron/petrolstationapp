<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClosingNozzleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'nozzle_id' => $this->resource['nozzle']->id,
            'pump_name' => "Pump " . ($this->resource['nozzle']->name ?? '1'),
            'product_name' => $this->resource['nozzle']->tank->product->name ?? 'Fuel',
            'opening_reading' => (float) $this->resource['opening_reading'],
            'digits' => $this->resource['nozzle']->digits,
        ];
    }
}
