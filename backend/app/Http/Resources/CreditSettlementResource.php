<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CreditSettlementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer?->name,
            'customer_balance' => (float) ($this->customer?->current_balance ?? 0),
            'station_name' => $this->station?->name,
            'amount' => (float) $this->amount,
            'method' => $this->method,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'status' => $this->status,
            'recorded_by' => $this->recordedBy?->name,
            'approved_by' => $this->approvedBy?->name,
            'balance_before' => $this->balance_before !== null ? (float) $this->balance_before : null,
            'balance_after' => $this->balance_after !== null ? (float) $this->balance_after : null,
            'rejection_reason' => $this->rejection_reason,
            'recorded_at' => $this->created_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
        ];
    }
}
