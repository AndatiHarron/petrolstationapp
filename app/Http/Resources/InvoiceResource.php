<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
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
            'invoice_number' => $this->invoice_number,
            'total_amount' => (float) $this->total_amount,
            'customer_name' => $this->customer->name ?? 'N/A',
            'customer_id' => $this->customer_id,
            'shift_id' => $this->shift_id,
            'download_url' => route('invoices.download', $this->id),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
