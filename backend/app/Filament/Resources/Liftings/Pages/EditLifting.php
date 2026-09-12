<?php

namespace App\Filament\Resources\Liftings\Pages;

use App\Filament\Resources\Liftings\LiftingResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditLifting extends EditRecord
{
    protected static string $resource = LiftingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
