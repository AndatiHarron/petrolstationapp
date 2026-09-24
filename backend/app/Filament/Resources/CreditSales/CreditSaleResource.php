<?php

namespace App\Filament\Resources\CreditSales;

use App\Filament\Resources\CreditSales\Pages\CreateCreditSale;
use App\Filament\Resources\CreditSales\Pages\EditCreditSale;
use App\Filament\Resources\CreditSales\Pages\ListCreditSales;
use App\Models\CreditSale;
use BackedEnum;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Enums\FontFamily;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class CreditSaleResource extends Resource
{
    protected static ?string $model = CreditSale::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBookOpen;

    protected static string|null|\UnitEnum $navigationGroup = 'Finance';

    protected static ?string $navigationLabel = 'Debtors';

    // The record itself stays a credit sale in the database; these are only
    // what a person reads.
    protected static ?string $modelLabel = 'debtor';

    protected static ?string $pluralModelLabel = 'debtors';

    public static function canCreate(): bool
    {
        return false;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Select::make('customer_id')
                ->relationship('customer', 'name')
                ->disabled(),

            TextInput::make('amount')
                ->prefix('KES')
                ->disabled(),

            TextInput::make('vehicle_reg')
                ->disabled(),

            Textarea::make('notes')
                ->disabled(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('created_at')
                ->label('Date')
                ->dateTime('d M Y, H:i')
                ->sortable(),

            TextColumn::make('amount')
                ->money('KES')
                ->color('danger')
                ->sortable(),

            TextColumn::make('vehicle_reg')
                ->label('Vehicle Registration')
                ->icon('heroicon-m-truck')
                ->searchable(),

            TextColumn::make('shift.id')
                ->label('Shift Ref')
                ->fontFamily(FontFamily::Mono)
                ->limit(8)
                ->toggleable(isToggledHiddenByDefault: true),
        ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('customer')
                    ->relationship('customer', 'name')
                    ->searchable()
                    ->preload(),

                Filter::make('created_at')
                    ->schema([
                        DatePicker::make('from'),
                        DatePicker::make('until'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($query) => $query->whereDate('created_at', '>=', $data['from']))
                            ->when($data['until'], fn ($query) => $query->whereDate('created_at', '<=', $data['until']));
                    }),
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
            'index' => ListCreditSales::route('/'),
            //            'create' => CreateCreditSale::route('/create'),
            //            'edit' => EditCreditSale::route('/{record}/edit'),
        ];
    }
}
