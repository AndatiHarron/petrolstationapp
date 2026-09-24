<?php

use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\artisan;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

function handoverAdmin(string $email, string $password = 'keep-me-please'): User
{
    $admin = User::factory()->create([
        'email' => $email,
        'password' => Hash::make($password),
        'organization_id' => Organization::firstOrCreate(
            ['name' => 'Octane Hq'],
            ['slug' => 'octane-hq', 'status' => 'active'],
        )->id,
    ]);

    $admin->assignRole(Role::where('name', 'super-admin')->firstOrFail());

    return $admin->fresh();
}

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

it('keeps the administrators and their passwords and removes everything else', function () {
    $first = handoverAdmin('one@handover.test');
    $second = handoverAdmin('two@handover.test');

    // The demonstration data really is there to begin with.
    expect(Organization::withoutGlobalScopes()->count())->toBeGreaterThan(0)
        ->and(Station::withoutGlobalScopes()->count())->toBeGreaterThan(0)
        ->and(User::withoutGlobalScopes()->count())->toBeGreaterThan(2);

    artisan('db:clean-for-handover', ['--force' => true, '--skip-backup' => true, '--expect' => 2])
        ->assertSuccessful();

    $survivors = User::withoutGlobalScopes()->pluck('email')->all();

    expect($survivors)->toEqualCanonicalizing(['one@handover.test', 'two@handover.test'])
        ->and(Organization::withoutGlobalScopes()->count())->toBe(0)
        ->and(Station::withoutGlobalScopes()->count())->toBe(0)
        ->and(Shift::withoutGlobalScopes()->count())->toBe(0);

    // The login still works, which is the whole point of keeping the account.
    foreach ([$first, $second] as $admin) {
        $kept = User::withoutGlobalScopes()->where('email', $admin->email)->firstOrFail();

        expect(Hash::check('keep-me-please', $kept->password))->toBeTrue()
            ->and($kept->hasRole('super-admin'))->toBeTrue()
            ->and($kept->organization_id)->toBeNull()
            ->and($kept->station_id)->toBeNull();
    }
});

it('leaves the roles and permissions every account depends on', function () {
    handoverAdmin('one@handover.test');

    artisan('db:clean-for-handover', ['--force' => true, '--skip-backup' => true])
        ->assertSuccessful();

    expect(Role::pluck('name')->sort()->values()->all())
        ->toBe(['admin', 'manager', 'super-admin'])
        ->and(DB::table('permissions')->count())->toBeGreaterThan(0);
});

it('clears the audit trail as well, so the new owner starts on their own record', function () {
    handoverAdmin('one@handover.test');

    DB::table('activity_log')->insert([
        'log_name' => 'default',
        'description' => 'something that happened during the demonstration',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    artisan('db:clean-for-handover', ['--force' => true, '--skip-backup' => true])
        ->assertSuccessful();

    expect(DB::table('activity_log')->count())->toBe(0);
});

/**
 * The one outcome worth guarding against absolutely: a database nobody can open.
 */
it('refuses to run when there is no administrator to leave behind', function () {
    User::withoutGlobalScopes()->get()->each(function (User $user) {
        $user->roles()->detach();
    });

    artisan('db:clean-for-handover', ['--force' => true, '--skip-backup' => true])
        ->assertFailed();

    expect(User::withoutGlobalScopes()->count())->toBeGreaterThan(0);
});

it('refuses when the number of administrators is not the number expected', function () {
    handoverAdmin('one@handover.test');

    artisan('db:clean-for-handover', ['--force' => true, '--skip-backup' => true, '--expect' => 2])
        ->assertFailed();

    expect(Organization::withoutGlobalScopes()->count())->toBeGreaterThan(0);
});

it('does not delete anything when the confirmation is declined', function () {
    handoverAdmin('one@handover.test');

    $before = Organization::withoutGlobalScopes()->count();

    artisan('db:clean-for-handover')
        ->expectsConfirmation('Empty the database now?', 'no')
        ->assertSuccessful();

    expect(Organization::withoutGlobalScopes()->count())->toBe($before);
});

/**
 * The cleanup has to stay clean. The seeder runs on every single boot, and it
 * used to create an "Octane Hq" organization to hang the owner off — so the
 * organization deleted on Tuesday would be back on Wednesday's deploy.
 */
it('does not put an organization back on the next deploy', function () {
    handoverAdmin('one@handover.test');

    artisan('db:clean-for-handover', ['--force' => true, '--skip-backup' => true])
        ->assertSuccessful();

    config(['services.super_admin.email' => 'one@handover.test']);
    config(['services.super_admin.password' => 'keep-me-please']);

    seed(\Database\Seeders\SuperAdminSeeder::class);

    expect(Organization::withoutGlobalScopes()->count())->toBe(0)
        ->and(User::withoutGlobalScopes()->where('email', 'one@handover.test')->first()->organization_id)
        ->toBeNull();
});
