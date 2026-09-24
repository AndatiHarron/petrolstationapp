<?php

use App\Filament\Resources\Users\Pages\EditUser;
use App\Models\Organization;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Facades\Filament;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
    Filament::setCurrentPanel('admin');
});

function panelRoleId(string $name): int
{
    return Role::where('name', $name)->firstOrFail()->getKey();
}

function panelSuperAdmin(): User
{
    $boss = User::factory()->create(['organization_id' => null, 'station_id' => null]);
    $boss->assignRole(Role::where('name', 'super-admin')->firstOrFail());

    return $boss->fresh();
}

/**
 * The owner of a petrol station hires and promotes their own people.
 *
 * Before this they could create an account with a role but never change one,
 * so a supervisor who moved to another station had to be deleted and entered
 * again — losing the trail that says who took which reading.
 */
it('lets an owner change the role of someone in their own organization', function () {
    $owner = User::where('email', 'admin@octane.com')->firstOrFail();
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();

    actingAs($owner);

    Livewire::test(EditUser::class, ['record' => $staff->getKey()])
        ->assertOk()
        ->fillForm(['roles' => [panelRoleId('admin')], 'station_id' => null])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($staff->fresh()->getRoleNames()->all())->toBe(['admin']);
});

it('refuses an owner the account of somebody in another organization', function () {
    $owner = User::where('email', 'admin@octane.com')->firstOrFail();

    $outsider = User::factory()->create([
        'organization_id' => Organization::factory()->create()->id,
    ]);
    $outsider->assignRole(Role::where('name', 'manager')->firstOrFail());

    expect($owner->can('update', $outsider))->toBeFalse()
        ->and($owner->can('delete', $outsider))->toBeFalse();

    // And the record is not even reachable: the resource scopes it out before
    // the policy is ever consulted.
    actingAs($owner);

    expect(fn () => Livewire::test(EditUser::class, ['record' => $outsider->getKey()]))
        ->toThrow(ModelNotFoundException::class);
});

it('refuses an owner the account of a platform administrator', function () {
    $owner = User::where('email', 'admin@octane.com')->firstOrFail();

    $boss = User::factory()->create(['organization_id' => $owner->organization_id]);
    $boss->assignRole(Role::where('name', 'super-admin')->firstOrFail());

    expect($owner->can('update', $boss))->toBeFalse();
});

it('never offers an owner the platform administrator role', function () {
    $owner = User::where('email', 'admin@octane.com')->firstOrFail();
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();

    actingAs($owner);

    $options = Livewire::test(EditUser::class, ['record' => $staff->getKey()])
        ->instance()
        ->getSchema('form')
        ->getComponent('roles')
        ->getOptions();

    expect($options)->not->toHaveKey(panelRoleId('super-admin'))
        ->and($options)->toHaveKey(panelRoleId('manager'));
});

it('offers a platform administrator every role', function () {
    actingAs(panelSuperAdmin());
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();

    $options = Livewire::test(EditUser::class, ['record' => $staff->getKey()])
        ->instance()
        ->getSchema('form')
        ->getComponent('roles')
        ->getOptions();

    expect($options)->toHaveKey(panelRoleId('super-admin'));
});

/**
 * The panel speaks the same words as the rest of the system.
 *
 * `manager` is what the database has always called the role and what forty
 * authorization checks are written against; "Supervisor" is what the proposal,
 * the app and the people using it call the job. A list showing only the former
 * is a list somebody searches in vain.
 */
it('names the roles the way the rest of the system does', function () {
    actingAs(panelSuperAdmin());
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();

    $options = Livewire::test(EditUser::class, ['record' => $staff->getKey()])
        ->instance()
        ->getSchema('form')
        ->getComponent('roles')
        ->getOptions();

    expect($options[panelRoleId('manager')])->toBe('Supervisor')
        ->and($options[panelRoleId('admin')])->toBe('Owner / Admin');
});

it('holds a person to one role', function () {
    actingAs(panelSuperAdmin());
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();

    Livewire::test(EditUser::class, ['record' => $staff->getKey()])
        ->fillForm(['roles' => [panelRoleId('admin'), panelRoleId('manager')]])
        ->call('save')
        ->assertHasFormErrors(['roles']);
});

it('asks a supervisor for a station and offers only their organizations', function () {
    actingAs(panelSuperAdmin());
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();

    $mine = Station::withoutGlobalScopes()
        ->where('organization_id', $staff->organization_id)
        ->pluck('id')
        ->all();

    $elsewhere = Station::factory()->create([
        'organization_id' => Organization::factory()->create()->id,
    ]);

    $component = Livewire::test(EditUser::class, ['record' => $staff->getKey()]);
    $options = $component->instance()->getSchema('form')->getComponent('station_id')->getOptions();

    expect(array_keys($options))->toEqualCanonicalizing($mine)
        ->and($options)->not->toHaveKey($elsewhere->id);

    $component->fillForm(['roles' => [panelRoleId('manager')], 'station_id' => null])
        ->call('save')
        ->assertHasFormErrors(['station_id']);
});

/**
 * An owner has no station of their own: they see every forecourt they run. A
 * station left on the record from a previous role would quietly narrow their
 * own reports to it.
 */
it('drops the station when somebody is promoted out of the forecourt', function () {
    actingAs(panelSuperAdmin());
    $staff = User::where('email', 'manager@octane.com')->firstOrFail();
    expect($staff->station_id)->not->toBeNull();

    Livewire::test(EditUser::class, ['record' => $staff->getKey()])
        ->fillForm(['roles' => [panelRoleId('admin')]])
        ->call('save')
        ->assertHasNoFormErrors();

    expect($staff->fresh()->station_id)->toBeNull();
});

it('will not let anybody delete their own account', function () {
    $boss = panelSuperAdmin();

    expect($boss->can('delete', $boss))->toBeFalse()
        ->and($boss->can('delete', User::where('email', 'admin@octane.com')->firstOrFail()))->toBeTrue();
});
