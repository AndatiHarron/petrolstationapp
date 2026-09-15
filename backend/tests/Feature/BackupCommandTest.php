<?php

use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\artisan;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);

    Storage::fake('backup-store');
    config()->set('filesystems.default', 'backup-store');
});

function latestSnapshot(): array
{
    $files = Storage::disk('backup-store')->files('backups');
    expect($files)->not->toBeEmpty();
    sort($files);

    return json_decode(Storage::disk('backup-store')->get(end($files)), true);
}

test('it writes a snapshot containing every table', function () {
    artisan('backup:run')->assertSuccessful();

    $snapshot = latestSnapshot();

    expect($snapshot)->toHaveKeys(['taken_at', 'restore_order', 'tables', 'row_count'])
        ->and($snapshot['tables'])->toHaveKeys(['users', 'stations', 'tanks', 'nozzles', 'products'])
        ->and($snapshot['row_count'])->toBeGreaterThan(0);
});

test('the rows in the snapshot are the rows in the database', function () {
    artisan('backup:run')->assertSuccessful();

    $snapshot = latestSnapshot();

    expect(count($snapshot['tables']['users']))->toBe(App\Models\User::withoutGlobalScopes()->count())
        ->and(collect($snapshot['tables']['users'])->pluck('email')->sort()->values()->all())
        ->toBe(App\Models\User::withoutGlobalScopes()->pluck('email')->sort()->values()->all());
});

test('parents are ordered before the rows that reference them', function () {
    artisan('backup:run')->assertSuccessful();

    $order = latestSnapshot()['restore_order'];
    $position = array_flip($order);

    // Restoring a shift before its station, or a reading before its shift,
    // would fail on the foreign key.
    expect($position['stations'])->toBeLessThan($position['tanks'])
        ->and($position['tanks'])->toBeLessThan($position['nozzles'])
        ->and($position['shifts'])->toBeLessThan($position['meter_readings'])
        ->and($position['organizations'])->toBeLessThan($position['stations'])
        ->and($position['customers'])->toBeLessThan($position['credit_sales']);
});

test('it refuses to run when the disk is the container itself', function () {
    // A backup written to the filesystem it is meant to outlive is not a
    // backup, so this is refused rather than quietly performed.
    config()->set('filesystems.default', 'local');

    artisan('backup:run')->assertFailed();
});

test('it keeps only the requested number of snapshots', function () {
    // Older keys, named the way the command names them.
    foreach (['2026-01-01T020000Z', '2026-01-02T020000Z', '2026-01-03T020000Z'] as $stamp) {
        Storage::disk('backup-store')->put("backups/{$stamp}.json", '{}');
    }

    artisan('backup:run --keep=2')->assertSuccessful();

    $remaining = Storage::disk('backup-store')->files('backups');

    expect($remaining)->toHaveCount(2)
        // The oldest go first, and the one just taken must survive.
        ->and(implode(',', $remaining))->not->toContain('2026-01-01')
        ->and(implode(',', $remaining))->not->toContain('2026-01-02');
});

test('a snapshot can be replayed into an empty database', function () {
    artisan('backup:run')->assertSuccessful();

    $snapshot = latestSnapshot();

    // Prove the snapshot is sufficient to rebuild from: empty the trading
    // tables, then insert the rows back in the order the snapshot gives.
    foreach (['payments', 'meter_readings', 'dip_readings', 'shifts'] as $table) {
        Illuminate\Support\Facades\DB::table($table)->delete();
    }

    foreach ($snapshot['restore_order'] as $table) {
        if (! in_array($table, ['payments', 'meter_readings', 'dip_readings', 'shifts'], true)) {
            continue;
        }

        foreach ($snapshot['tables'][$table] as $row) {
            Illuminate\Support\Facades\DB::table($table)->insert($row);
        }
    }

    expect(App\Models\Shift::withoutGlobalScopes()->count())
        ->toBe(count($snapshot['tables']['shifts']));
});
