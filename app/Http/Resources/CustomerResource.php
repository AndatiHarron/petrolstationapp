<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
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
            'email' => $this->email,
            'phone' => $this->phone,
            'tax_pin' => $this->tax_pin,

            'credit_limit' => (float) $this->credit_limit,
            'current_balance' => (float) $this->current_balance,
            'available_credit' => (float) ($this->credit_limit - $this->current_balance),

            'organization_id' => $this->organization_id,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
