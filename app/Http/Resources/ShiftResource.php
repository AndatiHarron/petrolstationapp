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
            'station_name' => $this->station->name,
            'started_at' => $this->started_at->toDateTimeString(),
            'status' => $this->status,
            'variance_alert' => $this->cash_variance < 0,
            'financials' => [
                'expected' => (float) $this->total_expected_cash,
                'collected' => (float) $this->total_collected_cash,
                'variance' => (float) $this->cash_variance
            ],
            'readings' => $this->whenLoaded('meterReadings')
        ];
    }
}
