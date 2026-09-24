<?php

namespace App\Filament\Resources\Users;

use App\Filament\Resources\Users\Pages\CreateUser;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\Pages\ListUsers;
use App\Models\Station;
use App\Models\User;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Pages\CreateRecord;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

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

        if (auth()->hasUser()) {
            $query->where('organization_id', auth()->user()->organization_id);
        }

        // Held out of every tenant's list, including that of the organization
        // the owner's own account nominally belongs to.
        return $query->whereDoesntHave(
            'roles',
            fn ($roles) => $roles->where('name', 'super-admin')
        );
    }

    /**
     * The role names currently picked in the form.
     *
     * The select stores role ids, because that is what the relationship saves,
     * but every rule worth writing here is about the name — whether a station
     * is needed, whether this is a supervisor. The roles table has three rows,
     * so resolving them is cheaper than carrying a parallel field.
     *
     * @return array<int, string>
     */
    protected static function selectedRoleNames(Get $get): array
    {
        $ids = array_filter((array) $get('roles'));

        if ($ids === []) {
            return [];
        }

        return Role::whereIn('id', $ids)->pluck('name')->all();
    }

    /**
     * Strip the station from anyone who is not a supervisor.
     *
     * The field is hidden once the role changes, and a hidden field is not
     * saved at all — so without this the old station stays on the record and
     * quietly narrows a new owner's reports to one forecourt. Done here rather
     * than in the browser so it holds however the form was submitted.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function clearStationUnlessSupervisor(array $data): array
    {
        $ids = array_filter((array) ($data['roles'] ?? []));

        $names = $ids === [] ? [] : Role::whereIn('id', $ids)->pluck('name')->all();

        if (! in_array('manager', $names, true)) {
            $data['station_id'] = null;
        }

        return $data;
    }

    /** The organization the form is currently working within. */
    protected static function formOrganizationId(Get $get): ?string
    {
        return $get('organization_id') ?? auth()->user()->organization_id;
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
                        ->helperText(fn ($livewire) => $livewire instanceof CreateRecord
                            ? null
                            : 'Leave blank to keep the current password.')
                        ->maxLength(255),

                    Select::make('organization_id')
                        ->relationship('organization', 'name')
                        ->searchable()
                        ->preload()
                        ->required()
                        ->visible(fn () => auth()->user()->hasRole('super-admin'))
                        ->live()
                        // Moving someone to another organization has to let go
                        // of their station, or they stay attached to a forecourt
                        // their new employer does not own.
                        ->afterStateUpdated(fn (Set $set) => $set('station_id', null))
                        ->default(auth()->user()->organization_id),
                ])->columns(2),

                Section::make('Permissions')->schema([
                    Select::make('roles')
                        ->label('Role')
                        // Named by their labels, not their database names. The
                        // rest of the system calls this person a Supervisor;
                        // somebody hunting for that word in a list of "manager"
                        // finds nothing and concludes the panel is broken.
                        ->relationship(
                            'roles',
                            'name',
                            fn (Builder $query) => auth()->user()->hasRole('super-admin')
                                ? $query
                                // Nobody hands out an account with more reach
                                // than their own. Only the platform's own
                                // administrators create another one.
                                : $query->where('name', '!=', 'super-admin'),
                        )
                        ->getOptionLabelFromRecordUsing(
                            fn (Role $record): string => User::ROLE_LABELS[$record->name]
                                ?? Str::headline($record->name)
                        )
                        ->multiple()
                        ->preload()
                        ->live()
                        ->required()
                        // One role each. Every screen in the system asks "what
                        // is this person" and takes the first answer, so a
                        // second role is not extra access, it is a coin toss.
                        ->rules(['array', 'max:1'])
                        ->validationMessages([
                            'max' => 'A person holds one role. Remove the other before saving.',
                        ])
                        ->afterStateUpdated(function (Get $get, Set $set): void {
                            if (! in_array('manager', static::selectedRoleNames($get), true)) {
                                $set('station_id', null);
                            }
                        })
                        ->helperText('An Owner / Admin sees every station. A Supervisor sees only the one assigned below.'),

                    Select::make('station_id')
                        ->label('Assigned Station')
                        ->relationship(
                            'station',
                            'name',
                            fn (Builder $query, Get $get) => $query
                                ->withoutGlobalScopes()
                                ->where('organization_id', static::formOrganizationId($get))
                                ->orderBy('name'),
                        )
                        ->searchable()
                        ->preload()
                        // Only a supervisor works a forecourt. An owner given a
                        // station would find their own reports quietly narrowed
                        // to it.
                        ->visible(fn (Get $get) => in_array('manager', static::selectedRoleNames($get), true))
                        ->required()
                        ->helperText(function (Get $get): string {
                            $hasStations = Station::withoutGlobalScopes()
                                ->where('organization_id', static::formOrganizationId($get))
                                ->exists();

                            // An empty dropdown that says nothing reads as a
                            // broken panel. It is usually just an organization
                            // that has not been set up yet, and saying so is the
                            // difference between a dead end and a next step.
                            return $hasStations
                                ? 'A Supervisor opens and closes shifts at this station only.'
                                : 'This organization has no stations yet. Add one under Stations first — a Supervisor without a station has nothing to open a shift on.';
                        }),
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
                    ->label('Role')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => User::ROLE_LABELS[$state] ?? Str::headline($state))
                    ->color(fn (string $state): string => match ($state) {
                        'admin' => 'danger',
                        'manager' => 'info',
                        default => 'gray'
                    }),
                TextColumn::make('organization.name')
                    ->label('Organization')
                    ->placeholder('Global Access'),
                TextColumn::make('station.name')
                    ->label('Station')
                    ->placeholder('All stations'),
            ])
            ->filters([
                SelectFilter::make('roles')
                    ->relationship('roles', 'name')
                    ->label('Role')
                    ->multiple()
                    ->preload(),

                SelectFilter::make('station')
                    ->relationship('station', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUsers::route('/'),
            'create' => CreateUser::route('/create'),
            'edit' => EditUser::route('/{record}/edit'),
        ];
    }
}
