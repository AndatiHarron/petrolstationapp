<?php

namespace App\Filament\Resources\CreditSales\Pages;

use App\Filament\Resources\CreditSales\CreditSaleResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListCreditSales extends ListRecords
{
    protected static string $resource = CreditSaleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
