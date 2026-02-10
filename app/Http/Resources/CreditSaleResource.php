<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CreditSaleResource extends JsonResource
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
            'amount' => (float) $this->amount,
            'vehicle_reg' => $this->vehicle_reg,
            'notes' => $this->notes,

            'organization_id' => $this->organization_id,
            'shift_id' => $this->shift_id,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer->name ?? null,

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
