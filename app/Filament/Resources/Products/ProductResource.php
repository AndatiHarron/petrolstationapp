<?php

namespace App\Filament\Resources\Products;

use App\Filament\Resources\Products\Pages\CreateProduct;
use App\Filament\Resources\Products\Pages\EditProduct;
use App\Filament\Resources\Products\Pages\ListProducts;
use App\Models\Product;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Table;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBeaker;

    protected static ?string $recordTitleAttribute = 'product';

    protected static string|null|\UnitEnum $navigationGroup = 'Infrastructure';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Product Details')->schema([
                TextInput::make('name')
                    ->required()
                    ->placeholder('Premium Petrol'),
            ]),

            Section::make('Pricing & Tax')->schema([
                TextInput::make('current_price')
                    ->label('Selling Price / Liter')
                    ->numeric()
                    ->prefix('KES')
                    ->required(),

                TextInput::make('vat_rate')
                    ->label('VAT Rate (%)')
                    ->numeric()
                    ->default(16)
                    ->suffix('%')
                    ->helperText('Standard fuel tax rate is 16%. Input 0 for exempt products.')
                    ->required(),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('name')->sortable(),
            TextColumn::make('current_price')->money('KES')->sortable(),
        ])
            ->filters([
                Filter::make('zero_rated')
                    ->label('Zero rated (no VAT)')
                    ->query(fn ($query) => $query->where('vat_rate', '<=', 0)),
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
            'index' => ListProducts::route('/'),
            'create' => CreateProduct::route('/create'),
            'edit' => EditProduct::route('/{record}/edit'),
        ];
    }
}
