<?php

namespace App\Filament\Resources\Users;

use App\Filament\Resources\Users\Pages\CreateUser;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\Pages\ListUsers;
use App\Filament\Resources\Users\Pages\ManageUsers;
use App\Models\User;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Pages\CreateRecord;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUsers;
    protected static string|null|\UnitEnum $navigationGroup = 'Settings';

    protected static ?string $recordTitleAttribute = 'user';

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        if (auth()->user()->hasRole('super-admin')) {
            return $query->withoutGlobalScopes();
        }

        if(auth()->hasUser()) {
            $query->where('organization_id', auth()->user()->organization_id);
        }

        return $query;
    }

    public static function form(Form|Schema $schema): Schema
    {
        return $schema
            ->schema([
                Section::make('User Details')->schema([
                    TextInput::make('name')
                        ->required()
                        ->maxLength(255),

                    TextInput::make('email')
                        ->email()
                        ->required()
                        ->maxLength(255),

                    TextInput::make('password')
                        ->password()
                        ->dehydrateStateUsing(fn ($state) => Hash::make($state))
                        ->dehydrated(fn ($state) => filled($state))
                        ->required(fn ($livewire) => $livewire instanceof CreateRecord)
                        ->maxLength(255),

                    Select::make('organization_id')
                        ->relationship('organization', 'name')
                        ->searchable()
                        ->preload()
                        ->required()
                        ->visible(fn () => auth()->user()->hasRole('super-admin'))
                        ->live()
                        ->default(auth()->user()->organization_id),
                ])->columns(2),

                Section::make('Permissions')->schema([
                    Select::make('roles')
                        ->relationship('roles', 'name')
                        ->multiple()
                        ->preload()
                        ->searchable()
                        ->live()
                        ->required(),

                    Select::make('station_id')
                        ->label('Assigned Station')
                        ->relationship('station', 'name', function (Builder $query, Get $get) {
                            $orgId = $get('organization_id') ?? auth()->user()->organization_id;

                            return $query->where('organization_id', $orgId);
                        })
                        ->searchable()
                        ->preload()
                        ->visible(fn (Get $get) => !empty($get('roles')))
                        ->helperText('Required for Managers to filter their dashboard')
                ])->columns(1),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('user')
            ->columns([
                TextColumn::make('name')->searchable(),
                TextColumn::make('email')->searchable(),
                TextColumn::make('roles.name')
                    ->badge()
                    ->color(fn (string $state):string => match($state) {
                        'admin' => 'danger',
                        'manager' => 'info',
                        default => 'gray'
                    }),
                TextColumn::make('organization.name')
                    ->label("Organization")
                    ->placeholder('Global Access'),
                TextColumn::make('station.name')
                    ->label('Station')
                    ->placeholder('Global Access')
            ])->recordActions([
                EditAction::make()
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUsers::route('/'),
            'create' => CreateUser::route('/create'),
            'edit' => EditUser::route('/{record}/edit')
        ];
    }
}
