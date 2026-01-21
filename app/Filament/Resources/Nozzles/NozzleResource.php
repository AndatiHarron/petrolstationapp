<?php

namespace App\Filament\Resources\Nozzles;

use App\Filament\Resources\Nozzles\Pages\CreateNozzle;
use App\Filament\Resources\Nozzles\Pages\EditNozzle;
use App\Filament\Resources\Nozzles\Pages\ListNozzles;
use App\Filament\Resources\Nozzles\Schemas\NozzleForm;
use App\Filament\Resources\Nozzles\Tables\NozzlesTable;
use App\Models\Nozzle;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class NozzleResource extends Resource
{
    protected static ?string $model = Nozzle::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'nozzle';

    public static function form(Schema $schema): Schema
    {
        return NozzleForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return NozzlesTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListNozzles::route('/'),
            'create' => CreateNozzle::route('/create'),
            'edit' => EditNozzle::route('/{record}/edit'),
        ];
    }
}
