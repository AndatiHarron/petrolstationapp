<?php

use App\Models\AgreementAcceptance;
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

    // The suite runs with enforcement off, because its tests act as
    // administrators of a working system. These tests are about the gate, so
    // they turn it on.
    config()->set('agreement.enforce', true);
});

function agreementOwner(): User
{
    $org = Organization::firstOrCreate(
        ['name' => 'Owner Hq'],
        ['slug' => 'owner-hq', 'status' => 'active'],
    );

    $u = User::create([
        'name' => 'Platform Owner',
        'email' => 'agreement-owner@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $org->id,
        'email_verified_at' => now(),
    ]);

    $u->assignRole(Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']));

    return $u;
}

// ── The gate holds ───────────────────────────────────────────────

test('an admin who has not accepted cannot reach the system', function () {
    actingAs(User::role('admin')->firstOrFail());

    foreach (['/api/v1/stations', '/api/v1/products', '/api/v1/shifts', '/api/v1/reports/pl'] as $path) {
        $response = getJson($path);

        $response->assertStatus(403);
        expect($response->json('error'))->toBe('agreement_required', "{$path} was not gated");
    }
});

test('the terms and the user endpoint stay reachable, or there is no way to accept', function () {
    actingAs(User::role('admin')->firstOrFail());

    getJson('/api/v1/agreement')->assertOk();
    getJson('/api/v1/user')->assertOk();
});

test('accepting opens the system', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    getJson('/api/v1/stations')->assertStatus(403);

    postJson('/api/v1/agreement/accept')
        ->assertOk()
        ->assertJsonPath('data.accepted', true);

    getJson('/api/v1/stations')->assertOk();
});

test('the gate is enforced by the server, not by the client hiding a screen', function () {
    // The same request that the app would make if someone skipped the screen.
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    postJson('/api/v1/products', ['name' => 'Snuck In', 'current_price' => 100, 'vat_rate' => 16])
        ->assertStatus(403)
        ->assertJsonPath('error', 'agreement_required');

    expect(App\Models\Product::withoutGlobalScopes()->where('name', 'Snuck In')->exists())->toBeFalse();
});

// ── Who it applies to ────────────────────────────────────────────

test('a manager is never asked', function () {
    actingAs(User::role('manager')->firstOrFail());

    getJson('/api/v1/shifts')->assertOk();
    expect(getJson('/api/v1/agreement')->json('data.applies_to_me'))->toBeFalse();
});

test('the platform owner is not bound by terms they are offering', function () {
    actingAs(agreementOwner());

    getJson('/api/v1/stations')->assertOk();
    expect(getJson('/api/v1/agreement')->json('data.applies_to_me'))->toBeFalse();
});

// ── Once per administrator ───────────────────────────────────────

test('acceptance is recorded once however many times it is sent', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    postJson('/api/v1/agreement/accept')->assertOk();
    postJson('/api/v1/agreement/accept')->assertOk();
    postJson('/api/v1/agreement/accept')->assertOk();

    expect(AgreementAcceptance::where('user_id', $admin->id)
        ->where('action', AgreementAcceptance::ACCEPTED)->count())->toBe(1);
});

test('it is not asked again on a later session', function () {
    $admin = User::role('admin')->firstOrFail();

    actingAs($admin);
    postJson('/api/v1/agreement/accept')->assertOk();

    // A fresh authentication, as a new sign-in would be.
    actingAs($admin->fresh());
    expect(getJson('/api/v1/agreement')->json('data.accepted'))->toBeTrue();
    getJson('/api/v1/stations')->assertOk();
});

test('one admin accepting does not let another in', function () {
    $first = User::role('admin')->firstOrFail();
    actingAs($first);
    postJson('/api/v1/agreement/accept')->assertOk();

    $second = User::create([
        'name' => 'Second Admin',
        'email' => 'second-admin@example.test',
        'password' => Hash::make('password-for-this-test-only'),
        'organization_id' => $first->organization_id,
        'email_verified_at' => now(),
    ]);
    $second->assignRole('admin');

    actingAs($second);
    getJson('/api/v1/stations')->assertStatus(403);
});

// ── Declining ────────────────────────────────────────────────────

test('declining is recorded and ends the session', function () {
    $admin = User::role('admin')->firstOrFail();
    $token = $admin->createToken('test')->plainTextToken;

    actingAs($admin);
    postJson('/api/v1/agreement/decline')
        ->assertOk()
        ->assertJsonPath('data.accepted', false);

    expect(AgreementAcceptance::where('user_id', $admin->id)
        ->where('action', AgreementAcceptance::DECLINED)->exists())->toBeTrue()
        // Refusing has to actually stop access, not leave a live token behind.
        ->and($admin->fresh()->tokens()->count())->toBe(0);

    unset($token);
});

test('declining does not open the system', function () {
    actingAs(User::role('admin')->firstOrFail());

    postJson('/api/v1/agreement/decline')->assertOk();
    getJson('/api/v1/stations')->assertStatus(403);
});

test('an admin who declined may still accept afterwards', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    postJson('/api/v1/agreement/decline')->assertOk();

    actingAs($admin->fresh());
    postJson('/api/v1/agreement/accept')->assertOk();
    getJson('/api/v1/stations')->assertOk();

    // Both decisions remain on record; neither overwrites the other.
    expect(AgreementAcceptance::where('user_id', $admin->id)->count())->toBe(2);
});

// ── Versioning ───────────────────────────────────────────────────

test('a new version is asked again, and the old acceptance is kept', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);
    postJson('/api/v1/agreement/accept')->assertOk();
    getJson('/api/v1/stations')->assertOk();

    config()->set('agreement.version', '2.0');

    getJson('/api/v1/stations')->assertStatus(403);

    postJson('/api/v1/agreement/accept')->assertOk();
    getJson('/api/v1/stations')->assertOk();

    expect(AgreementAcceptance::where('user_id', $admin->id)->pluck('version')->sort()->values()->all())
        ->toBe(['1.0', '2.0']);
});

// ── The record itself ────────────────────────────────────────────

test('the record carries what a dispute would need', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);

    postJson('/api/v1/agreement/accept', [], ['User-Agent' => 'NozzleApp/1.0 (Android 14)'])->assertOk();

    $record = AgreementAcceptance::where('user_id', $admin->id)->firstOrFail();

    expect($record->user_email)->toBe($admin->email)
        ->and($record->version)->toBe('1.0')
        ->and($record->action)->toBe('accepted')
        ->and($record->decided_at)->not->toBeNull()
        ->and($record->ip_address)->not->toBeNull();
});

test('the record survives the account being deleted', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);
    postJson('/api/v1/agreement/accept')->assertOk();

    $email = $admin->email;
    Illuminate\Support\Facades\DB::table('users')->where('id', $admin->id)->delete();

    // Someone accepted, and that stays true when their account goes.
    expect(AgreementAcceptance::where('user_email', $email)->exists())->toBeTrue();
});

// ── The text ─────────────────────────────────────────────────────

test('the terms are served in full', function () {
    actingAs(User::role('admin')->firstOrFail());

    $data = getJson('/api/v1/agreement')->assertOk()->json('data');

    expect($data['version'])->toBe('1.0')
        ->and($data['title'])->toContain('Administrator Agreement')
        ->and($data['sections'])->toHaveCount(21);

    foreach ($data['sections'] as $i => $section) {
        expect($section['heading'])->not->toBeEmpty("section {$i} has no heading")
            ->and($section['body'])->not->toBeEmpty("section {$i} has no body");
    }

    // The clauses that carry the legal weight must actually be present.
    $all = json_encode($data);
    foreach ([
        'Limitation of Liability',
        'No Warranty',
        'Indemnity',
        'Data Protection Act',
        'laws of the Republic of Kenya',
        'AS IS',
        'NOT AN ACCOUNTING SYSTEM',
    ] as $needle) {
        expect($all)->toContain($needle);
    }
});

// ── Who may read the log ─────────────────────────────────────────

test('only the platform owner may read the acceptance log', function () {
    $admin = User::role('admin')->firstOrFail();
    actingAs($admin);
    postJson('/api/v1/agreement/accept')->assertOk();

    getJson('/api/v1/agreement/acceptances')->assertStatus(403);

    actingAs(agreementOwner());
    $rows = getJson('/api/v1/agreement/acceptances')->assertOk()->json('data');

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['user_email'])->toBe($admin->email);
});
