<?php

namespace App\Filament\Resources\Shifts;

use App\Filament\Resources\Shifts\Pages\CreateShift;
use App\Filament\Resources\Shifts\Pages\EditShift;
use App\Filament\Resources\Shifts\Pages\ListShifts;
use App\Filament\Resources\Shifts\Schemas\ShiftForm;
use App\Filament\Resources\Shifts\Tables\ShiftsTable;
use App\Models\Shift;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Select;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ShiftResource extends Resource
{
    protected static ?string $model = Shift::class;
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClock;

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        $user = auth()->user();

        if($user->hasRole('manager')) {
            return $query->where('station_id', $user->station_id);
        }

        return $query;
    }

    protected static ?string $recordTitleAttribute = 'shift';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Select::make('station_id')
            ->relationship('station', 'name')
            ->disabled(fn() => auth()->user()->hasRole('manager'))
            ->default(fn() => auth()->user()->station_id)
            ->required(),

            Hidden::make('started_by_user_id')
            ->default(auth()->id())
            ->required(),

            DateTimePicker::make('started_at')
                ->default(now())
                ->required()
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('station.name')
                ->label('Station')
                ->sortable()
                ->hidden(fn() => auth()->user()->hasRole('manager')),

                TextColumn::make('status')
                ->badge()
                ->color(fn(string $state): string => match ($state) {
                    'OPEN' => 'gray',
                    'LOCKED' => 'warning',
                    'APPROVED' => 'success',
                }),

                TextColumn::make('started_at')
                ->dateTime()
                ->sortable(),

                TextColumn::make('total_collected_cash')
                ->money('KES')
                ->label('Cash Declared'),

                TextColumn::make('cash_variance')
                ->money('KES')
                ->label('Cash Variance')
                ->color(fn(string $state): string => $state < 0 ? 'danger' : 'success')
                ->visible(fn() => auth()->user()->hasRole('admin')),
            ])
            ->recordActions([
                Action::make('lock')
                ->label('Lock Shift')
                ->icon('heroicon-o-lock-closed')
                ->color('warning')
                ->requiresConfirmation()
                ->visible(fn(Shift $record) => $record->status === 'OPEN')
                ->action(function (Shift $record) {
                    $record->update(['status' => 'LOCKED', 'locked_at' => now()]);
                }),

                Action::make('approve')
                ->label('Approve')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->requiresConfirmation()
                ->visible(fn(Shift $record) => auth()->user()->can('approve', $record))
                ->action(function (Shift $record) {
                    $record->update(['status' => 'APPROVED']);
                })
            ])
            ->defaultSort('started_at', 'desc');
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
            'index' => ListShifts::route('/'),
            'create' => CreateShift::route('/create'),
//            'edit' => EditShift::route('/{record}/edit'),
        ];
    }
}
