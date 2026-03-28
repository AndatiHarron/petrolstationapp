<?php

namespace App\Filament\Resources\Shifts\Pages;

use App\Filament\Resources\Shifts\ShiftResource;
use App\Models\Nozzle;
use Filament\Resources\Pages\CreateRecord;

class CreateShift extends CreateRecord
{
    protected static string $resource = ShiftResource::class;

    protected function beforeCreate(): void
    {
        $stationId = $this->data['station_id'] ?? auth()->user()->station_id;

        if ($stationId && ! Nozzle::where('station_id', $stationId)->exists()) {
            $this->halt('Cannot create shift: no nozzles are configured for this station.');
        }
    }
}
