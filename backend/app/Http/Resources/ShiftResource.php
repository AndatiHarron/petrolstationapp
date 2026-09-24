<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftResource extends JsonResource
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
            'shift_number' => $this->shift_number,
            'station_name' => $this->station->name,
            'started_at' => $this->started_at->toIso8601String(),
            // Null where the station has not set a shift pattern, which
            // the app reads as "no scheduled end" rather than as missing.
            'scheduled_end_at' => $this->scheduled_end_at?->toIso8601String(),
            // Closed by the system rather than by a person, and still
            // owing the figures nobody was there to take.
            'awaiting_readings' => $this->status === \App\Models\Shift::STATUS_PENDING_READINGS,
            'auto_closed_at' => $this->auto_closed_at?->toIso8601String(),
            'schedule_name' => $this->schedule?->name,
            'status' => $this->status,
            'variance_alert' => $this->cash_variance < 0 || $this->stock_variance_liters < 0,
            'financials' => [
                'expected' => (float) $this->total_expected_cash,
                'collected' => (float) $this->total_collected_cash,
                'variance' => (float) $this->cash_variance,
            ],
            'wet_stock' => [
                'variance_liters' => (float) $this->stock_variance_liters,
                'total_sold_liters' => (float) $this->total_stock_sold_liters,
            ],
            'readings' => $this->whenLoaded('meterReadings'),
            'dips' => $this->whenLoaded('dipReadings'),
            'payments' => $this->whenLoaded('payments'),
            'credit_sales' => CreditSaleResource::collection($this->whenLoaded('creditSales')),
        ];
    }
}
