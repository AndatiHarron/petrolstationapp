<?php

namespace App\Filament\Resources\ActivityLogs;

use App\Filament\Resources\ActivityLogs\Pages\ManageActivityLogs;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\KeyValue;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Support\Enums\FontFamily;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Spatie\Activitylog\Models\Activity;

class ActivityLogResource extends Resource
{
    protected static ?string $model = Activity::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFingerPrint;

    protected static string|null|\UnitEnum $navigationGroup = 'System';

    protected static ?string $navigationLabel = 'Audit Logs';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')
                    ->label('Time')
                    ->dateTime('d M H:i:s')
                    ->sortable(),

                TextColumn::make('causer.name')
                    ->label('User')
                    ->searchable(),

                TextColumn::make('description')
                    ->badge()
                    ->color(fn ($state) => match ($state) {
                        'created' => 'success',
                        'updated' => 'warning',
                        'deleted' => 'danger',
                        default => 'gray'
                    }),

                TextColumn::make('subject_type')
                    ->label('Entity')
                    ->formatStateUsing(fn ($state) => class_basename($state)),

                //                TextColumn::make('properties.attributes')
                //                    ->label('New Data')
                //                    ->formatStateUsing(fn ($state) => json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),)
                //                    ->fontFamily(FontFamily::Mono)
                //                    ->wrap()
                //                    ->limit(50)
                //                    ->toggleable(),
                //
                //                TextColumn::make('properties.old')
                //                    ->label('Previous Data')
                //                    ->formatStateUsing(fn ($state) => json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES))
                //                    ->fontFamily(FontFamily::Mono)
                //                    ->wrap()
                //                    ->limit(50)
                //                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('event')
                    ->options([
                        'created' => 'Created',
                        'updated' => 'Updated',
                        'deleted' => 'Deleted',
                    ]),

                Filter::make('created_at')
                    ->label('When')
                    ->schema([
                        DatePicker::make('from'),
                        DatePicker::make('until'),
                    ])
                    ->query(fn ($query, array $data) => $query
                        ->when($data['from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
                        ->when($data['until'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date))),
            ])
            ->recordActions([
                ViewAction::make()
                    ->slideOver()
                    ->schema([
                        Section::make('Changes')->schema([
                            KeyValue::make('properties.attributes')
                                ->label('New Values')
                                ->keyLabel('Field')
                                ->valueLabel('Value'),
                            KeyValue::make('properties.old')
                                ->label('Old Values')
                                ->keyLabel('Field')
                                ->valueLabel('Value'),
                        ]),
                    ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageActivityLogs::route('/'),
        ];
    }
}
