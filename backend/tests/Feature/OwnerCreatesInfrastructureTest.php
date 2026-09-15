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
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

/**
 * After the database is cleared down to the platform owners, those accounts
 * belong to no organization — there are none left. Setting the system up again
 * starts with the owner creating one, so the owner has to be able to create
 * infrastructure inside it while having no organization of their own.
 */
function detachedOwner(): User
{
    $owner = User::create([
        'name' => 'Platform Owner',
        'email' => 'detached-owner@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => null,
        'email_verified_at' => now(),
    ]);

    $owner->assignRole(Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']));

    return $owner;
}

test('an owner with no organization must say which one the station belongs to', function () {
    actingAs(detachedOwner());

    // stations.organization_id is not nullable and the trait has nothing to
    // fill it from, so without this rule the insert failed on the constraint.
    postJson('/api/v1/stations', ['name' => 'Kakamega Road'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('organization_id');
});

test('an owner can create a station inside a named organization', function () {
    actingAs(detachedOwner());

    $org = Organization::factory()->create(['status' => 'active']);

    $response = postJson('/api/v1/stations', [
        'name' => 'Kakamega Road',
        'organization_id' => $org->id,
    ])->assertCreated();

    $station = Station::withoutGlobalScopes()->findOrFail($response->json('data.id'));

    expect($station->organization_id)->toBe($org->id);
});

test('an owner must name an organization that exists', function () {
    actingAs(detachedOwner());

    postJson('/api/v1/stations', [
        'name' => 'Nowhere',
        'organization_id' => (string) Illuminate\Support\Str::uuid(),
    ])->assertStatus(422)->assertJsonValidationErrors('organization_id');
});

test('a tenant admin still gets their own organization and cannot choose another', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    $other = Organization::factory()->create(['status' => 'active']);

    // Sending someone else's organization must not move the station there.
    $response = postJson('/api/v1/stations', [
        'name' => 'Tenant Station',
        'organization_id' => $other->id,
    ])->assertCreated();

    $station = Station::withoutGlobalScopes()->findOrFail($response->json('data.id'));

    expect($station->organization_id)->toBe($admin->organization_id)
        ->and($station->organization_id)->not->toBe($other->id);
});

test('an owner belonging to an organization still needs no organization_id', function () {
    // The rule is conditional on having none, not on being the owner.
    $org = Organization::factory()->create(['status' => 'active']);
    $owner = detachedOwner();
    $owner->update(['organization_id' => $org->id]);

    actingAs($owner);

    $response = postJson('/api/v1/stations', ['name' => 'Owner Home Station'])->assertCreated();

    expect(Station::withoutGlobalScopes()->findOrFail($response->json('data.id'))->organization_id)
        ->toBe($org->id);
});
