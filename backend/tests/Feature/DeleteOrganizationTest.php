<?php

use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\artisan;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    $this->tenant = Organization::withoutGlobalScopes()->firstOrFail();
});

it('removes the organization and everything belonging to it', function () {
    $name = $this->tenant->name;

    expect(Station::withoutGlobalScopes()->where('organization_id', $this->tenant->id)->count())
        ->toBeGreaterThan(0);

    artisan('org:delete', ['name' => [$name], '--force' => true, '--skip-backup' => true])
        ->assertSuccessful();

    expect(Organization::withoutGlobalScopes()->where('id', $this->tenant->id)->exists())->toBeFalse()
        ->and(Station::withoutGlobalScopes()->where('organization_id', $this->tenant->id)->count())->toBe(0)
        ->and(Shift::withoutGlobalScopes()->where('organization_id', $this->tenant->id)->count())->toBe(0)
        ->and(User::withoutGlobalScopes()->where('organization_id', $this->tenant->id)->count())->toBe(0);
});

it('matches the name whatever the casing', function () {
    artisan('org:delete', [
        'name' => [mb_strtoupper($this->tenant->name)],
        '--force' => true,
        '--skip-backup' => true,
    ])->assertSuccessful();

    expect(Organization::withoutGlobalScopes()->where('id', $this->tenant->id)->exists())->toBeFalse();
});

it('takes several organizations at once', function () {
    $second = Organization::create(['name' => 'Ogembo Energies', 'slug' => 'ogembo', 'status' => 'active']);

    artisan('org:delete', [
        'name' => [$this->tenant->name, 'Ogembo Energies'],
        '--force' => true,
        '--skip-backup' => true,
    ])->assertSuccessful();

    expect(Organization::withoutGlobalScopes()->count())->toBe(0);
});

/**
 * A name that does not exist is far more likely to be a typo than a request to
 * delete nothing, and deleting the wrong tenant is not recoverable.
 */
it('deletes nothing when any name does not match', function () {
    artisan('org:delete', [
        'name' => [$this->tenant->name, 'Not A Real Company'],
        '--force' => true,
        '--skip-backup' => true,
    ])->assertFailed();

    expect(Organization::withoutGlobalScopes()->where('id', $this->tenant->id)->exists())->toBeTrue();
});

/**
 * The one outcome worth guarding against absolutely: a system with nobody who
 * can sign in to it.
 */
it('keeps a platform administrator who happened to be parked in that organization', function () {
    $boss = User::factory()->create(['organization_id' => $this->tenant->id, 'station_id' => null]);
    $boss->assignRole(Role::where('name', 'super-admin')->firstOrFail());

    artisan('org:delete', ['name' => [$this->tenant->name], '--force' => true, '--skip-backup' => true])
        ->assertSuccessful();

    $kept = User::withoutGlobalScopes()->where('email', $boss->email)->first();

    expect($kept)->not->toBeNull()
        ->and($kept->organization_id)->toBeNull()
        ->and($kept->hasRole('super-admin'))->toBeTrue();
});

it('changes nothing when the confirmation is declined', function () {
    artisan('org:delete', ['name' => [$this->tenant->name]])
        ->expectsConfirmation('Delete 1 organization(s) and everything above?', 'no')
        ->assertSuccessful();

    expect(Organization::withoutGlobalScopes()->where('id', $this->tenant->id)->exists())->toBeTrue();
});
