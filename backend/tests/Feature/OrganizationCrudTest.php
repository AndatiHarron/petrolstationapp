<?php

use App\Models\Organization;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

function owner(): User
{
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

    return $owner;
}

test('the owner can rename a tenant', function () {
    $tenant = Organization::factory()->create(['name' => 'Old Name']);

    actingAs(owner())
        ->patchJson("/api/v1/organizations/{$tenant->id}", ['name' => 'New Name'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name');

    expect($tenant->fresh()->name)->toBe('New Name');
});

test('the owner can take a tenant out of service without deleting it', function () {
    $tenant = Organization::factory()->create(['status' => 'active']);

    actingAs(owner())
        ->patchJson("/api/v1/organizations/{$tenant->id}", ['status' => 'inactive'])
        ->assertOk();

    expect($tenant->fresh()->status)->toBe('inactive');
});

test('saving a tenant without changing its slug does not trip the unique rule', function () {
    $tenant = Organization::factory()->create(['slug' => 'keep-me']);

    actingAs(owner())
        ->patchJson("/api/v1/organizations/{$tenant->id}", [
            'name' => 'Renamed',
            'slug' => 'keep-me',
        ])
        ->assertOk();
});

test('a slug already taken by another tenant is rejected', function () {
    Organization::factory()->create(['slug' => 'taken']);
    $tenant = Organization::factory()->create(['slug' => 'mine']);

    actingAs(owner())
        ->patchJson("/api/v1/organizations/{$tenant->id}", ['slug' => 'taken'])
        ->assertStatus(422);
});

test('an empty tenant can be deleted', function () {
    $tenant = Organization::factory()->create();

    actingAs(owner())
        ->deleteJson("/api/v1/organizations/{$tenant->id}")
        ->assertNoContent();

    expect(Organization::find($tenant->id))->toBeNull();
});

test('a tenant holding records is refused, and says what it holds', function () {
    $tenant = Organization::factory()->create();
    Station::factory()->create(['organization_id' => $tenant->id]);

    actingAs(owner())
        ->deleteJson("/api/v1/organizations/{$tenant->id}")
        ->assertStatus(422)
        ->assertJsonPath('message', fn (string $message) => str_contains($message, '1 stations'));

    // Refused, not half-done.
    expect(Organization::find($tenant->id))->not->toBeNull();
});

test('an administrator cannot rename or delete a tenant', function () {
    $tenant = Organization::factory()->create();
    $admin = User::role('admin')->firstOrFail();

    actingAs($admin)
        ->patchJson("/api/v1/organizations/{$tenant->id}", ['name' => 'Hijacked'])
        ->assertForbidden();

    actingAs($admin)
        ->deleteJson("/api/v1/organizations/{$tenant->id}")
        ->assertForbidden();

    expect($tenant->fresh()->name)->not->toBe('Hijacked');
});
