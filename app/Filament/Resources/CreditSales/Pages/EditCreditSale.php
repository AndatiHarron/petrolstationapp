<?php

namespace App\Filament\Resources\CreditSales\Pages;

use App\Filament\Resources\CreditSales\CreditSaleResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditCreditSale extends EditRecord
{
    protected static string $resource = CreditSaleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
