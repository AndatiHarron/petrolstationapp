<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClosingShiftResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'shift_id' => $this->id,
            'status' => $this->status,
            'station_name' => $this->station->name ?? 'Station',

            'nozzles' => ClosingNozzleResource::collection($this->prepareNozzles()),
            'tanks' => ClosingTankResource::collection($this->prepareTanks()),
        ];
    }

    protected function prepareNozzles()
    {
        return $this->station->nozzles->map(function ($nozzle) {
            $shiftReading = $this->meterReadings->where('nozzle_id', $nozzle->id)->first();

            // Return a simple array/object that the NozzleResource can consume
            return [
                'nozzle' => $nozzle,
                'opening_reading' => $shiftReading ? $shiftReading->opening_reading : $nozzle->current_reading,
            ];
        });
    }

    protected function prepareTanks()
    {
        return $this->station->tanks->map(function ($tank) {
            $shiftDip = $this->dipReadings->where('tank_id', $tank->id)->first();

            return [
                'tank' => $tank,
                // `opening_volume_liters` is the column; the old name read as
                // null on every dip that had one, so a re-opened shift showed
                // its tanks as starting from empty.
                'opening_volume' => $shiftDip
                    ? ($shiftDip->opening_volume_liters ?? $tank->current_volume ?? 0)
                    : ($tank->current_volume ?? 0),
            ];
        });
    }
}
