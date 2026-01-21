<?php

namespace App\Filament\Resources\Tanks;

use App\Filament\Resources\Tanks\Pages\CreateTank;
use App\Filament\Resources\Tanks\Pages\EditTank;
use App\Filament\Resources\Tanks\Pages\ListTanks;
use App\Filament\Resources\Tanks\Schemas\TankForm;
use App\Filament\Resources\Tanks\Tables\TanksTable;
use App\Models\Tank;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class TankResource extends Resource
{
    protected static ?string $model = Tank::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArchiveBox;
    protected static string|null|\UnitEnum $navigationGroup = "Infrastructure";

    protected static ?string $recordTitleAttribute = 'tank';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([

            Section::make('Details')
                ->schema([
                    Select::make('station_id')
                        ->relationship('station', 'name', fn (Builder $query) =>
                        $query->where('organization_id', auth()->user()->organization_id)
                        )
                        ->required(),

                    Select::make('product_id')
                        ->relationship('product', 'name', fn (Builder $query) =>
                        $query->where('organization_id', auth()->user()->organization_id)
                        )
                        ->required(),

                    TextInput::make('name')
                        ->required()
                        ->placeholder('e.g. Underground Tank 1'),

                    TextInput::make('capacity_liters')
                        ->numeric()
                        ->required(),

                    TextInput::make('current_volume')
                        ->label('Current Volume (Liters)')
                        ->numeric()
                        ->default(0),

                    TextInput::make('current_dip_mm')
                        ->label('Current Dip Minutes (mm)')
                        ->numeric()
                        ->default(0),
                ])->columns(2),

            Section::make('Calibration Chart')
                ->description('Map dip levels (mm) to volume (liters) for accurate stock calculation')
                ->schema([
                   Repeater::make('calibration_chart')
                    ->schema([
                        TextInput::make('mm')
                            ->required()
                            ->numeric()
                            ->label('Dip (mm)'),

                        TextInput::make('liters')
                            ->required()
                            ->numeric()
                            ->label('Volume (L)')
                    ])
                    ->columns(2)
                    ->defaultItems(2)
                    ->collapsible()
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('name')->searchable(),
            TextColumn::make('station.name')->sortable(),
            TextColumn::make('product.name')->sortable(),
            TextColumn::make('current_volume')->suffix(' L'),
            TextColumn::make('capacity_liters')->label('Capacity')->suffix(' L'),
        ])
            ->recordActions([
                EditAction::make()
            ]);
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
            'index' => ListTanks::route('/'),
            'create' => CreateTank::route('/create'),
            'edit' => EditTank::route('/{record}/edit'),
        ];
    }
}
