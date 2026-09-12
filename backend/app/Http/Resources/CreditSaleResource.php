<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CreditSaleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * A credit sale is only meaningful alongside who took it and what it did to
     * the customer's standing, so the shift, the attendant and the customer's
     * credit position travel with it rather than needing a second lookup.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $creditLimit = (float) ($this->customer->credit_limit ?? 0);
        $balance = (float) ($this->customer->current_balance ?? 0);

        return [
            'id' => $this->id,
            'amount' => (float) $this->amount,
            'vehicle_reg' => $this->vehicle_reg,
            'notes' => $this->notes,

            'organization_id' => $this->organization_id,
            'shift_id' => $this->shift_id,
            'shift_number' => $this->shift->shift_number ?? null,
            'station_name' => $this->shift->station->name ?? null,

            // The attendant who opened the shift the sale was taken on.
            'recorded_by' => $this->shift->startedBy->name ?? null,

            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer->name ?? null,
            'customer_credit_limit' => $creditLimit,
            'customer_balance' => $balance,
            'customer_available_credit' => round(max($creditLimit - $balance, 0), 2),
            'customer_over_limit' => $creditLimit > 0 && $balance > $creditLimit,

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
