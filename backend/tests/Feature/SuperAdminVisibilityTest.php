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
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

/**
 * The platform owner's account is deliberately absent from every user list.
 *
 * Tenant scoping alone does not achieve this: the owner belongs to an
 * organization like any other row, so an administrator of that organization
 * would otherwise see it.
 */
function makeOwner(?Organization $organization = null): User
{
    $organization ??= Organization::firstOrCreate(
        ['name' => 'Octane Hq'],
        ['slug' => 'octane-hq', 'status' => 'active'],
    );

    $owner = User::create([
        'name' => 'System Administrator',
        'email' => 'owner@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $organization->id,
        'email_verified_at' => now(),
    ]);

    $owner->assignRole(Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']));

    return $owner;
}

test('the owner account is absent from a tenant admin user list', function () {
    makeOwner();

    $admin = User::role('admin')->firstOrFail();

    $response = actingAs($admin)->getJson('/api/v1/users')->assertOk();

    $emails = collect($response->json('data'))->pluck('email');

    expect($emails)->not->toContain('owner@example.test')
        ->and($emails)->toContain($admin->email);
});

test('the owner account is absent even to an admin inside its own organization', function () {
    $organization = Organization::firstOrCreate(
        ['name' => 'Octane Hq'],
        ['slug' => 'octane-hq', 'status' => 'active'],
    );

    makeOwner($organization);

    // An administrator sharing the owner's organization is the case tenant
    // scoping cannot cover, since both rows carry the same organization_id.
    $insider = User::create([
        'name' => 'Hq Admin',
        'email' => 'hq-admin@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $organization->id,
        'email_verified_at' => now(),
    ]);
    $insider->assignRole('admin');

    $response = actingAs($insider)->getJson('/api/v1/users')->assertOk();

    $emails = collect($response->json('data'))->pluck('email');

    expect($emails)->not->toContain('owner@example.test')
        ->and($emails)->toContain('hq-admin@example.test');
});

test('the owner still sees every account, including their own', function () {
    $owner = makeOwner();

    $response = actingAs($owner)->getJson('/api/v1/users')->assertOk();

    $emails = collect($response->json('data'))->pluck('email');

    expect($emails)->toContain('owner@example.test');
});
