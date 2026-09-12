<?php

namespace App\Filament\Resources\Liftings;

use App\Filament\Resources\Liftings\Pages\CreateLifting;
use App\Filament\Resources\Liftings\Pages\EditLifting;
use App\Filament\Resources\Liftings\Pages\ListLiftings;
use App\Models\Lifting;
use App\Models\Tank;
use BackedEnum;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class LiftingResource extends Resource
{
    protected static ?string $model = Lifting::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedListBullet;

    protected static string|null|\UnitEnum $navigationGroup = 'Inventory';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Select::make('station_id')
                ->relationship('station', 'name')
                ->live()
                ->required(),

            Select::make('tank_id')
                ->label('Destination Tank')
                ->relationship('tank', 'name', fn ($query, $get) => $query->where('station_id', $get('station_id'))
                )
                ->required(),

            DatePicker::make('lifting_date')->required()->default(now()),
            TextInput::make('invoice_number'),

            TextInput::make('volume_liters')
                ->numeric()
                ->suffix(' L')
                ->required(),

            TextInput::make('buying_price_per_liter')
                ->numeric()
                ->prefix('KES')
                ->required()
                ->live()
                ->afterStateUpdated(function ($state, $get, $set) {
                    // 1. Calculate Total Cost
                    $volume = (float) $get('volume_liters');
                    $cost = $state * $volume;
                    $set('total_cost', $cost);

                    // 2. Auto-Calculate VAT based on Product Rate
                    if ($tankId = $get('tank_id')) {
                        $tank = Tank::with('product')->find($tankId);
                        $vatRate = (float) ($tank->product->vat_rate ?? 0);

                        $tax = app(\App\Services\TaxService::class)->calculateInputTax((float) $cost, $vatRate);
                        $set('tax_paid', $tax);
                    }
                }),

            TextInput::make('total_cost')
                ->numeric()
                ->prefix('KES')
                ->disabled()
                ->dehydrated()
                ->readOnly(),

            TextInput::make('tax_paid')
                ->label('Input VAT (Paid)')
                ->numeric()
                ->prefix('KES')
                ->required()
                ->helperText('Auto-calculated based on product VAT rate, but editable'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->recordTitleAttribute('Liftings')
            ->columns([
                TextColumn::make('lifting_date')
                    ->date('d M Y')
                    ->sortable(),

                TextColumn::make('invoice_number')
                    ->sortable(),

                TextColumn::make('station.name')
                    ->sortable(),

                TextColumn::make('tank.name')
                    ->label('Destination Tank')
                    ->description(fn ($record) => $record->tank->product->name ?? ''),

                TextColumn::make('volume_liters')
                    ->numeric(2)
                    ->suffix(' L')
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('buying_price_per_liter')
                    ->money('KES')
                    ->label('Buying Price')
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('total_cost')
                    ->money('KES')
                    ->sortable(),
                //
                //                TextColumn::make('tax_paid')
                //                    ->money('KES')
                //                    ->label('Input VAT')
                //                    ->color('success')
                //                    ->sortable()

            ])
            ->filters([
                SelectFilter::make('station')
                    ->relationship('station', 'name'),

                Filter::make('lifting_date')
                    ->schema([
                        DatePicker::make('from'),
                        DatePicker::make('until'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($q) => $q->whereDate('lifting_date', '>=', $data['from']))
                            ->when($data['until'], fn ($q) => $q->whereDate('lifting_date', '<=', $data['until']));
                    }),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                DeleteBulkAction::make(),
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
            'index' => ListLiftings::route('/'),
            'create' => CreateLifting::route('/create'),
            'edit' => EditLifting::route('/{record}/edit'),
        ];
    }
}
