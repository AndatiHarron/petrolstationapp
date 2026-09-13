<?php

use App\Models\Organization;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

function suspendTenantOf(User $user): Organization
{
    $organization = $user->organization;
    $organization->update(['status' => 'inactive']);

    return $organization;
}

test('an admin of a suspended organization cannot add a station', function () {
    $admin = User::role('admin')->firstOrFail();
    suspendTenantOf($admin);

    actingAs($admin)
        ->postJson('/api/v1/stations', ['name' => 'Sneaky Station', 'is_active' => true])
        ->assertForbidden()
        ->assertJsonPath('message', 'This organization has been suspended. Contact your provider.');

    expect($admin->organization->stations()->where('name', 'Sneaky Station')->exists())
        ->toBeFalse();
});

test('a manager of a suspended organization cannot open a shift', function () {
    $manager = User::role('manager')->firstOrFail();
    suspendTenantOf($manager);

    actingAs($manager)
        ->postJson('/api/v1/shifts/start')
        ->assertForbidden();
});

test('a suspended organization cannot even read its own data', function () {
    $admin = User::role('admin')->firstOrFail();
    suspendTenantOf($admin);

    actingAs($admin)->getJson('/api/v1/stations')->assertForbidden();
    actingAs($admin)->getJson('/api/v1/shifts')->assertForbidden();
});

test('logging in is refused outright rather than handing out a token', function () {
    $admin = User::role('admin')->firstOrFail();
    $admin->update(['password' => Hash::make('a-known-password')]);
    suspendTenantOf($admin);

    postJson('/api/login', [
        'email' => $admin->email,
        'password' => 'a-known-password',
    ])
        ->assertForbidden()
        ->assertJsonPath('message', 'This organization has been suspended. Contact your provider.');
});

test('restoring the organization restores access', function () {
    $admin = User::role('admin')->firstOrFail();
    $organization = suspendTenantOf($admin);

    actingAs($admin)->getJson('/api/v1/stations')->assertForbidden();

    $organization->update(['status' => 'active']);

    actingAs($admin->fresh())->getJson('/api/v1/stations')->assertOk();
});

test('the platform owner still reaches a suspended tenant, to put it back', function () {
    $admin = User::role('admin')->firstOrFail();
    $organization = suspendTenantOf($admin);

    $hq = Organization::firstOrCreate(
        ['name' => 'Octane Hq'],
        ['slug' => 'octane-hq', 'status' => 'active'],
    );
    $owner = User::create([
        'name' => 'System Administrator',
        'email' => 'owner@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $hq->id,
        'email_verified_at' => now(),
    ]);
    $owner->assignRole(Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']));

    actingAs($owner)->getJson('/api/v1/stations')->assertOk();

    actingAs($owner)
        ->patchJson("/api/v1/organizations/{$organization->id}", ['status' => 'active'])
        ->assertOk();

    expect($organization->fresh()->status)->toBe('active');
});

test('an active organization is unaffected', function () {
    $admin = User::role('admin')->firstOrFail();

    expect($admin->organization->status)->toBe('active');

    actingAs($admin)->getJson('/api/v1/stations')->assertOk();
});
