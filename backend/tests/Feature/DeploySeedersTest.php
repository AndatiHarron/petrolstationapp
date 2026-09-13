<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

/**
 * These two seeders run on every container boot, so running them twice has to
 * be harmless. The roles seeder used to use Role::create and threw on a second
 * run; the owner seeder used updateOrCreate and reset the password each time.
 */
test('the roles seeder can run twice', function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(RolesAndPermissionsSeeder::class);

    expect(Role::where('guard_name', 'web')->pluck('name')->sort()->values()->all())
        ->toBe(['admin', 'manager', 'super-admin'])
        ->and(Permission::count())->toBe(6);
});

test('a manager keeps only the two permissions it should have', function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(RolesAndPermissionsSeeder::class);

    $manager = Role::where('name', 'manager')->firstOrFail();

    expect($manager->permissions->pluck('name')->sort()->values()->all())
        ->toBe(['lock_shifts', 'view_dashboard']);
});

test('the owner seeder creates the account with the configured password', function () {
    config()->set('services.super_admin.email', 'owner@example.test');
    config()->set('services.super_admin.password', 'first-password');

    seed(RolesAndPermissionsSeeder::class);
    seed(SuperAdminSeeder::class);

    $owner = User::withoutGlobalScopes()->where('email', 'owner@example.test')->firstOrFail();

    expect($owner->hasRole('super-admin'))->toBeTrue()
        ->and(Hash::check('first-password', $owner->password))->toBeTrue();
});

test('running the owner seeder again does not reset a changed password', function () {
    config()->set('services.super_admin.email', 'owner@example.test');
    config()->set('services.super_admin.password', 'the-deploy-time-password');

    seed(RolesAndPermissionsSeeder::class);
    seed(SuperAdminSeeder::class);

    // The owner changes it afterwards, as anyone would.
    $owner = User::withoutGlobalScopes()->where('email', 'owner@example.test')->firstOrFail();
    $owner->update(['password' => Hash::make('what-they-chose-later')]);

    // A redeploy runs the seeder again.
    seed(SuperAdminSeeder::class);

    $owner->refresh();

    expect(Hash::check('what-they-chose-later', $owner->password))->toBeTrue()
        ->and(Hash::check('the-deploy-time-password', $owner->password))->toBeFalse()
        ->and(User::withoutGlobalScopes()->where('email', 'owner@example.test')->count())->toBe(1);
});
