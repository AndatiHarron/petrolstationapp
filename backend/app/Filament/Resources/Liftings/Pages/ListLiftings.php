<?php

namespace App\Filament\Resources\Liftings\Pages;

use App\Filament\Resources\Liftings\LiftingResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLiftings extends ListRecords
{
    protected static string $resource = LiftingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
