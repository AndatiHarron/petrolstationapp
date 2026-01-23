<?php

namespace App\Filament\Resources\Customers;

use App\Filament\Resources\Customers\Pages\CreateCustomer;
use App\Filament\Resources\Customers\Pages\EditCustomer;
use App\Filament\Resources\Customers\Pages\ListCustomers;
use App\Filament\Resources\Customers\Schemas\CustomerForm;
use App\Filament\Resources\Customers\Tables\CustomersTable;
use App\Models\Customer;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Table;

class CustomerResource extends Resource
{
    protected static ?string $model = Customer::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            TextInput::make('name')->required(),

            TextInput::make('email')
                ->email()
                ->required()
                ->maxLength(255),

            TextInput::make('phone')->tel(),
            TextInput::make('tax_pin')->label('KRA Pin'),
            TextInput::make('credit_limit')
                ->numeric()
                ->prefix('KES')
                ->default(0),

            TextInput::make('current_balance')
                ->numeric()
                ->disabled()
                ->prefix('KES'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('customer')
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('email')
                    ->searchable(),

                TextColumn::make('phone')
                    ->icon('heroicon-m-phone')
                    ->searchable(),

                TextColumn::make('tax_pin')
                    ->label('KRA Pin')->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('credit_limit')
                    ->money('KES')
                    ->sortable(),

                TextColumn::make('current_balance')
                    ->money('KES')
                    ->sortable()
                    ->weight('bold')
                    ->color(fn(string $state): string => $state >  0 ? 'danger' : ($state < 0 ? 'success' : 'gray')),

                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true)
            ])
            ->filters([
                Filter::make('has_debt')
                ->query(fn ($query) => $query->where('current_balance', '>', 0))
                ->label('Has Debt')
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()
                ])
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
            'index' => ListCustomers::route('/'),
            'create' => CreateCustomer::route('/create'),
            'edit' => EditCustomer::route('/{record}/edit'),
        ];
    }
}
