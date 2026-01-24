<?php

namespace App\Filament\Resources\Shifts;

use App\Filament\Resources\Customers\RelationManagers\CreditSalesRelationManager;
use App\Filament\Resources\Shifts\Pages\CreateShift;
use App\Filament\Resources\Shifts\Pages\EditShift;
use App\Filament\Resources\Shifts\Pages\ListShifts;
use App\Filament\Resources\Shifts\Schemas\ShiftForm;
use App\Filament\Resources\Shifts\Tables\ShiftsTable;
use App\Models\Customer;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Tank;
use App\Services\ShiftReconciliationService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Wizard\Step;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
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
            Section::make('Shift Details')
            ->schema([
                Select::make('station_id')
                    ->relationship('station', 'name')
                    ->disabled(fn() => auth()->user()->hasRole('manager'))
                    ->default(fn() => auth()->user()->station_id)
                    ->dehydrated()
                    ->required(),

                Hidden::make('started_by_user_id')
                    ->default(auth()->id())
                    ->required(),

                DateTimePicker::make('started_at')
                    ->default(now())
                    ->required()
            ])
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

                TextColumn::make('stock_variance_liters')
                    ->label('Stock Variance')
                    ->numeric(2)
                    ->suffix(' L')
                    ->sortable()
                    ->color(fn(string $state): string => $state < 0 ? 'danger' : 'success')
                    ->visible(fn() => auth()->user()->hasRole('admin'))
                    ->toggleable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'LOCKED' => 'Pending Approval',
                        'APPROVED' => 'Approved',
                    ])
            ])
            ->recordActions([
                Action::make('lock')
                    ->label('Lock Shift')
                    ->icon('heroicon-o-lock-closed')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalWidth('xl')
                    ->visible(fn(Shift $record) => $record->status === 'OPEN')
                    ->schema([
                        TextInput::make('total_collected_cash')
                        ->label('Total Collected')
                        ->numeric()
                        ->prefix('KES')
                        ->required()
                        ->helperText('Enter the total cash physically held by the attendant.'),
                    ])
                    ->steps([
                        Step::make('Meter Readings')
                            ->description('Enter closing digits for each nozzle')
                            ->schema(function (Shift $record) {
                                $schema = [];
                                $nozzles = Nozzle::where('station_id', $record->station_id)->get();

                                foreach ($nozzles as $nozzle) {
                                    $schema[] = TextInput::make("meters.{$nozzle->id}")
                                        ->label("{$nozzle->name}")
                                        ->helperText("Opening: " . $nozzle->current_reading)
                                        ->numeric()
                                        ->required()
                                        ->minValue($nozzle->current_reading)
                                        ->placeholder('Closing Reading');
                                }

                                return $schema;
                            }),

                        Step::make('Tank Dips')
                            ->description('Measure fuel levels')
                            ->schema(function (Shift $record) {
                                $schema = [];
                                $tanks = Tank::where('station_id', $record->station_id)->get();

                                foreach ($tanks as $tank) {
                                    $schema[] = TextInput::make("tanks.{$tank->id}")
                                        ->label($tank->name . "({$tank->product->name})")
                                        ->numeric()
                                        ->required()
                                        ->suffix('mm');
                                }

                                return $schema;
                            }),

                        Step::make('Payments')
                            ->description('Declare Collections')
                            ->schema([
                                TextInput::make('payments.cash')
                                    ->label('Cash Handed Over')
                                    ->numeric()->default(0)->prefix('KES'),

                                TextInput::make('payments.mpesa')
                                    ->label('M-Pesa collections')
                                    ->numeric()->default(0)->prefix('KES'),

                                Repeater::make('credit_breakdown')
                                    ->label('Credit Sales Breakdown')
                                    ->schema([
                                        Select::make('customer_id')
                                            ->label('Customer')
                                            ->options(Customer::query()->pluck('name', 'id'))
                                            ->searchable()
                                            ->preload()
                                            ->required()
                                            ->columnSpanFull()
                                            ->createOptionForm([
                                                TextInput::make('name')->required(),
                                                TextInput::make('email')->required(),
                                                TextInput::make('phone')
                                            ])
                                            ->createOptionUsing(function (array $data) {
                                                return Customer::create($data + [
                                                    'organization_id' => auth()->user()->organization_id
                                                    ])->id;
                                            }),

                                        TextInput::make('amount')
                                            ->label('Amount')
                                            ->numeric()
                                            ->required()
                                            ->prefix('KES')
                                            ->columnSpan(1),

                                        TextInput::make('vehicle_reg')
                                            ->label('Vehicle Reg')
                                            ->columnSpan(1)
                                    ])
                                ->columns(2)
                                ->addActionLabel('Add Credit Customer')
                            ])
                    ])
                    ->action(function (Shift $record, array $data, ShiftReconciliationService $service) {
                        $formattedMeters = [];
                        $nozzles = Nozzle::where('station_id', $record->station_id)->get();

                        foreach($data['meters'] as $nozzleId => $closingReading) {
                            $nozzle = $nozzles->find($nozzleId);
                            $formattedMeters[] = [
                                'nozzle_id' => $nozzleId,
                                'opening_reading' => $nozzle->current_reading,
                                'closing_reading' => $closingReading,
                                'evidence_path' => null
                            ];
                        }

                        $formattedDips = [];
                        foreach ($data['tanks'] as $tankId => $dipMm) {
                            $formattedDips[] = [
                                'tank_id' => $tankId,
                                'dip_mm' => $dipMm,
                            ];
                        }

                        $payments = [
                            'cash' => $data['payments']['cash'] ?? 0,
                            'mpesa' => $data['payments']['mpesa'] ?? 0,
                            'credit' => $data['credit_breakdown'] ?? 0,
                        ];

                        $service->reconcile(
                            $record,
                            $formattedMeters,
                            $formattedDips,
                            $payments
                        );

                        $record->refresh();

                        Notification::make()->title('Shift Locked & Reconciled')->success()->send();
                    }),

                Action::make('approve')
                    ->label('Approve')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn(Shift $record) => auth()->user()->can('approve', $record))
                    ->action(function (Shift $record) {
                        $record->update(['status' => 'APPROVED']);

                        Notification::make()
                            ->title('Shift Approved')
                            ->success()
                            ->send();
                    })
            ])
            ->defaultSort('started_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            CreditSalesRelationManager::class
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListShifts::route('/'),
            'create' => CreateShift::route('/create'),
            'edit' => EditShift::route('/{record}/edit'),
        ];
    }
}
