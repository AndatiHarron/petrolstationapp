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

            // Sent so the app can work out what a set of readings is worth
            // before it submits them. A supervisor who can see the expected
            // takings beside the cash in the drawer catches a keying error on
            // the forecourt, rather than an admin finding it the next day.
            'price_per_liter' => (float) ($this->resource['nozzle']->tank->product->current_price ?? 0),
            'vat_rate' => (float) ($this->resource['nozzle']->tank->product->vat_rate ?? 0),
        ];
    }
}
