<?php

namespace App\Filament\Resources\Nozzles\Pages;

use App\Filament\Resources\Nozzles\NozzleResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListNozzles extends ListRecords
{
    protected static string $resource = NozzleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
