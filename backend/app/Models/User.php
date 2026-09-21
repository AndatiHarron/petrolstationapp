<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\BelongsToOrganization;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements FilamentUser
{
    use BelongsToOrganization;
    use HasApiTokens;

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    // Aliased rather than used plainly: the methods below wrap Spatie's so a
    // role name the app accepts can resolve to the role actually stored. A
    // trait's methods are not reachable through `parent::`, so they are given
    // second names here to call through to.
    use HasRoles {
        hasRole as protected spatieHasRole;
        hasAnyRole as protected spatieHasAnyRole;
        assignRole as protected spatieAssignRole;
    }
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'organization_id',
        'station_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Role names that mean the same thing, mapped to the one the code checks.
     *
     * The proposal calls the station-floor role "Supervisor"; the database has
     * always called it `manager`, and forty-odd authorization checks are written
     * against that name. Renaming the row would mean touching every one of them,
     * and an authorization rule that is edited in bulk is exactly the kind that
     * quietly stops holding.
     *
     * So both names exist and both resolve to the same permissions. `supervisor`
     * is what an admin picks and what the app displays; `manager` is what the
     * policies check, and it keeps checking it.
     *
     * @var array<string, string>
     */
    public const ROLE_ALIASES = [
        'supervisor' => 'manager',
    ];

    /** The name shown to people for a stored role. */
    public const ROLE_LABELS = [
        'super-admin' => 'Super Admin',
        'admin' => 'Owner / Admin',
        'manager' => 'Supervisor',
    ];

    /**
     * Resolve an alias to the role actually held.
     *
     * @param  mixed  $roles
     */
    protected static function canonicalRole(mixed $roles): mixed
    {
        if (is_string($roles)) {
            // Spatie accepts a pipe-delimited string for "any of these".
            if (str_contains($roles, '|')) {
                return implode('|', array_map(
                    fn (string $role): string => self::ROLE_ALIASES[trim($role)] ?? trim($role),
                    explode('|', $roles)
                ));
            }

            return self::ROLE_ALIASES[$roles] ?? $roles;
        }

        if (is_array($roles)) {
            return array_map(fn ($role) => is_string($role) ? (self::ROLE_ALIASES[$role] ?? $role) : $role, $roles);
        }

        return $roles;
    }

    public function hasRole($roles, ?string $guard = null): bool
    {
        return $this->spatieHasRole(self::canonicalRole($roles), $guard);
    }

    public function hasAnyRole(...$roles): bool
    {
        return $this->spatieHasAnyRole(...array_map(self::canonicalRole(...), $roles));
    }

    public function assignRole(...$roles)
    {
        return $this->spatieAssignRole(...array_map(self::canonicalRole(...), $roles));
    }

    /** The label for this user's role, for anything a person reads. */
    public function roleLabel(): string
    {
        $role = $this->getRoleNames()->first();

        return self::ROLE_LABELS[$role] ?? ucfirst((string) $role);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function canAccessPanel(Panel $panel): bool
    {
        if ($this->hasRole('super-admin')) {
            return true;
        }

        // A suspended tenant is shut out of the web panel as well as the API;
        // otherwise suspension only half applies.
        if ($this->organization && $this->organization->status !== 'active') {
            return false;
        }

        return $this->organization_id !== null && $this->hasAnyRole(['admin', 'manager']);
    }
}
