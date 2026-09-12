<?php

namespace App\Filament\Resources\Nozzles\Pages;

use App\Filament\Resources\Nozzles\NozzleResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditNozzle extends EditRecord
{
    protected static string $resource = NozzleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
