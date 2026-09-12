<?php

namespace App\Filament\Resources\Customers\RelationManagers;

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
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CreditSalesRelationManager extends RelationManager
{
    protected static string $relationship = 'creditSales';

    public function isReadOnly(): bool
    {
        return true;
    }

//    public function form(Schema $schema): Schema
//    {
//        return $schema
//            ->components([
//                TextInput::make('amount')
//                    ->required()
//                    ->maxLength(255),
//            ]);
//    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('amount')
            ->columns([
                TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d M Y')
                    ->sortable(),

                TextColumn::make('amount')
                ->money('KES')
                ->weight('bold'),

                TextColumn::make('vehicle_reg')
                ->label('Vehicle Registration'),

                TextColumn::make('shift.status')
                ->badge()
                ->color(fn (string $state): string => match ($state) {
                    'LOCKED' => 'warning',
                    'APPROVED' => 'success',
                    default => 'gray'
                })
            ])
            ->headerActions([]);
    }
}
