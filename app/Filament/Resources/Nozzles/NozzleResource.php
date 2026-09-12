<?php

namespace App\Filament\Resources\Nozzles;

use App\Filament\Resources\Nozzles\Pages\CreateNozzle;
use App\Filament\Resources\Nozzles\Pages\EditNozzle;
use App\Filament\Resources\Nozzles\Pages\ListNozzles;
use App\Models\Nozzle;
use App\Models\Tank;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class NozzleResource extends Resource
{
    protected static ?string $model = Nozzle::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFunnel;

    protected static string|null|\UnitEnum $navigationGroup = 'Infrastructure';

    protected static ?string $recordTitleAttribute = 'nozzle';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            TextInput::make('name')
                ->required()
                ->placeholder('e.g. Pump 1 - Nozzle A'),

            Select::make('station_id')
                ->relationship('station', 'name', fn (Builder $query) => $query->where('organization_id', auth()->user()->organization_id)
                )
                ->live()
                ->afterStateUpdated(fn (Set $set) => $set('tank_id', null))
                ->required(),

            Select::make('tank_id')
                ->label('Connected Tank')
                ->options(fn (Get $get): Collection => Tank::query()
                    ->where('station_id', $get('station_id'))
                    ->pluck('name', 'id'))
                ->searchable()
                ->preload()
                ->required(),

            TextInput::make('digits')
                ->numeric()
                ->default(7)
                ->label('Counter Digits (e.g. 7)'),

            TextInput::make('current_reading')
                ->numeric()
                ->label('Current Meter Reading')
                ->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('name')->searchable(),
            TextColumn::make('station.name')->sortable(),
            TextColumn::make('tank.product.name')->label('Product'),
            TextColumn::make('current_reading')->numeric(),
        ])
            ->filters([
                SelectFilter::make('station')
                    ->relationship('station', 'name')
                    ->searchable()
                    ->preload(),

                SelectFilter::make('tank')
                    ->relationship('tank', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->recordActions([
                EditAction::make(),
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
            'index' => ListNozzles::route('/'),
            'create' => CreateNozzle::route('/create'),
            'edit' => EditNozzle::route('/{record}/edit'),
        ];
    }
}
