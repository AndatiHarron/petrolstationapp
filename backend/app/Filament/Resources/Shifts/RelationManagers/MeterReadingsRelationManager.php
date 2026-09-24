<?php

namespace App\Filament\Resources\Shifts\RelationManagers;

use Filament\Actions\AssociateAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\DissociateAction;
use Filament\Actions\DissociateBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class MeterReadingsRelationManager extends RelationManager
{
    protected static string $relationship = 'meterReadings';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('opening_reading')
                    ->required()
                    ->maxLength(255),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('opening_reading')
            ->columns([
                TextColumn::make('nozzle.name')
                    ->label('Nozzle'),

                // The model's signed link, rather than a path resolved against
                // a hardcoded local disk — which showed broken images as soon
                // as evidence moved to object storage.
                ImageColumn::make('evidence_url')
                    ->label('Proof')
                    ->circular(),

                TextColumn::make('opening_reading'),
                TextColumn::make('closing_reading'),
                TextColumn::make('volume_sold')->label('Liters'),
                TextColumn::make('total_value')->money('KES'),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                CreateAction::make(),
                AssociateAction::make(),
            ])
            ->recordActions([
                EditAction::make(),
                DissociateAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DissociateBulkAction::make(),
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
