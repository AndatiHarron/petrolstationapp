<?php

namespace App\Filament\Resources\Tanks;

use App\Filament\Resources\Tanks\Pages\CreateTank;
use App\Filament\Resources\Tanks\Pages\EditTank;
use App\Filament\Resources\Tanks\Pages\ListTanks;
use App\Models\Tank;
use App\Support\CalibrationChart;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class TankResource extends Resource
{
    protected static ?string $model = Tank::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArchiveBox;

    protected static string|null|\UnitEnum $navigationGroup = 'Infrastructure';

    protected static ?string $recordTitleAttribute = 'tank';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Details')
                ->schema([
                    Select::make('station_id')
                        ->relationship('station', 'name', fn (Builder $query) => $query->where('organization_id', auth()->user()->organization_id)
                        )
                        ->required(),

                    Select::make('product_id')
                        ->relationship('product', 'name', fn (Builder $query) => $query->where('organization_id', auth()->user()->organization_id)
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
                        ->label('Current Dip Reading (mm)')
                        ->numeric()
                        ->default(0),
                ])->columns(2),

            Section::make('Calibration Chart')
                ->description('Map dip levels (mm) to volume (liters) for accurate stock calculation')
                ->schema([
                    // A certificate runs to a hundred rows or more, and adding
                    // them one at a time is why a tank ends up with no chart —
                    // and with no chart no stock variance can be calculated.
                    Textarea::make('calibration_paste')
                        ->label('Paste the calibration certificate')
                        ->helperText('Two columns, dip then litres, one row per line. Tabs, commas or spaces all work, so it can be pasted straight from a spreadsheet or a PDF. Units, headings and blank lines are ignored.')
                        ->rows(6)
                        ->dehydrated(false),

                    Actions::make([
                        Action::make('convertCalibrationPaste')
                            ->label('Convert to rows')
                            ->icon(Heroicon::OutlinedArrowDownOnSquare)
                            ->action(function (Get $get, Set $set): void {
                                $rows = CalibrationChart::parse($get('calibration_paste'));

                                if ($rows === []) {
                                    return;
                                }

                                $set('calibration_chart', $rows);
                                $set('calibration_paste', null);
                            }),
                    ])->key('calibrationPaste'),

                    Repeater::make('calibration_chart')
                        ->schema([
                            TextInput::make('mm')
                                ->required()
                                ->numeric()
                                ->label('Dip (mm)'),

                            TextInput::make('liters')
                                ->required()
                                ->numeric()
                                ->label('Volume (L)'),
                        ])
                        ->columns(2)
                        ->defaultItems(2)
                        ->collapsible(),
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
            ->filters([
                SelectFilter::make('station')
                    ->relationship('station', 'name')
                    ->searchable()
                    ->preload(),

                SelectFilter::make('product')
                    ->relationship('product', 'name')
                    ->searchable()
                    ->preload(),

                // Refill planning: anything at or below 30% of capacity.
                Filter::make('low_stock')
                    ->label('Low stock')
                    ->query(fn ($query) => $query->whereColumn(
                        'current_volume',
                        '<=',
                        DB::raw('capacity_liters * 0.3')
                    )),
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
            'index' => ListTanks::route('/'),
            'create' => CreateTank::route('/create'),
            'edit' => EditTank::route('/{record}/edit'),
        ];
    }
}
