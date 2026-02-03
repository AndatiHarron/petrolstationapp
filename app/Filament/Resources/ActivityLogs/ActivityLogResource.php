<?php

namespace App\Filament\Resources\ActivityLogs;

use App\Filament\Resources\ActivityLogs\Pages\ManageActivityLogs;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\KeyValue;
use Filament\Schemas\Components\Section;
use Spatie\Activitylog\Models\Activity;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Enums\FontFamily;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

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
                        ])
                    ])
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageActivityLogs::route('/'),
        ];
    }
}
