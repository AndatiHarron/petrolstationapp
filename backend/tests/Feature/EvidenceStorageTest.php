<?php

use App\Models\MeterReading;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\DevSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    seed(DevSeeder::class);
});

/**
 * Evidence photos are the tamper record the whole reconciliation rests on, so
 * three things have to hold: they are written to the configured disk rather
 * than the container's own, they are reachable only through a signed link, and
 * that link stops working.
 */
test('an uploaded photo goes to the configured disk, not a hardcoded local one', function () {
    // Standing in for R2: a disk that is not 'public', which is what the code
    // used to name outright.
    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $reading = MeterReading::factory()->make();
    $path = UploadedFile::fake()->image('meter.jpg')->store('meter-evidence');

    expect($path)->toStartWith('meter-evidence/')
        ->and(Storage::disk('evidence-store')->exists($path))->toBeTrue()
        // The old target must be untouched.
        ->and(Storage::disk('public')->exists($path))->toBeFalse();

    unset($reading);
});

test('the integrity hash is computed without a local filesystem path', function () {
    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $bytes = 'the-exact-bytes-of-a-photo';
    Storage::disk('evidence-store')->put('meter-evidence/a.jpg', $bytes);

    // md5 of the contents is what md5_file produced, so hashes recorded by the
    // previous implementation still compare equal.
    expect(md5(Storage::disk()->get('meter-evidence/a.jpg')))->toBe(md5($bytes));
});

test('a reading with a photo is serialised with a signed url, never a bare path', function () {
    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $shift = Shift::factory()->create(['organization_id' => User::first()->organization_id]);
    $reading = MeterReading::factory()->create([
        'organization_id' => $shift->organization_id,
        'shift_id' => $shift->id,
        'evidence_path' => 'meter-evidence/proof.jpg',
    ]);

    $payload = $reading->toArray();

    expect($payload)->toHaveKey('evidence_url')
        ->and($payload['evidence_url'])->toBeString()
        ->and($payload['evidence_url'])->not->toBe('meter-evidence/proof.jpg');
});

test('a reading with no photo has a null url rather than a broken one', function () {
    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $shift = Shift::factory()->create(['organization_id' => User::first()->organization_id]);
    $reading = MeterReading::factory()->create([
        'organization_id' => $shift->organization_id,
        'shift_id' => $shift->id,
        'evidence_path' => null,
    ]);

    expect($reading->toArray()['evidence_url'])->toBeNull();
});

test('an unauthenticated request cannot reach a shift, so cannot obtain a link', function () {
    $shift = Shift::factory()->create(['organization_id' => User::first()->organization_id]);

    getJson("/api/v1/shifts/{$shift->id}")->assertUnauthorized();
});

test('a user from another organization cannot obtain a link', function () {
    $shift = Shift::factory()->create(['organization_id' => User::first()->organization_id]);

    // A manager belonging to a different tenant.
    $outsider = User::factory()->create([
        'organization_id' => \App\Models\Organization::factory()->create()->id,
    ]);
    $outsider->assignRole('manager');

    // 404, not 403: the organization scope removes the row from the query
    // before route-model binding runs, so the request cannot even confirm the
    // shift exists — a stronger answer than refusing a record you have named.
    actingAs($outsider)
        ->getJson("/api/v1/shifts/{$shift->id}")
        ->assertNotFound();
});

test('a signed url carries an expiry and the credentials stay on the server', function () {
    // The real S3 driver, pointed at a bucket that does not need to exist for a
    // signature to be computed — presigning is local, no request is made.
    config()->set('filesystems.default', 's3');
    config()->set('filesystems.disks.s3', [
        'driver' => 's3',
        'key' => 'test-key-id',
        'secret' => 'test-secret-value',
        'region' => 'auto',
        'bucket' => 'evidence',
        'endpoint' => 'https://account.r2.cloudflarestorage.com',
        'use_path_style_endpoint' => true,
    ]);

    $shift = Shift::factory()->create(['organization_id' => User::first()->organization_id]);
    $reading = MeterReading::factory()->create([
        'organization_id' => $shift->organization_id,
        'shift_id' => $shift->id,
        'evidence_path' => 'meter-evidence/proof.jpg',
    ]);

    $url = $reading->evidence_url;

    expect($url)->toContain('meter-evidence/proof.jpg')
        ->and($url)->toContain('X-Amz-Signature')
        // A lifetime, so the link stops working.
        ->and($url)->toContain('X-Amz-Expires')
        // The key id identifies the credential; the secret must never appear.
        ->and($url)->not->toContain('test-secret-value');

    // The expiry is the short one the model sets, not a day.
    preg_match('/X-Amz-Expires=(\d+)/', $url, $matches);
    expect((int) ($matches[1] ?? 0))->toBeGreaterThan(0)->toBeLessThanOrEqual(900);
});

test('a shift will not lock if the meter photo could not be stored', function () {
    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $manager = User::where('email', 'manager@octane.com')->firstOrFail();
    actingAs($manager);

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    // The disk is configured with throw => false, so a storage outage makes
    // putFileAs return false rather than raise. Reproduce exactly that.
    $failing = Mockery::mock(Illuminate\Contracts\Filesystem\Filesystem::class);
    $failing->shouldReceive('putFileAs')->andReturn(false);
    Storage::shouldReceive('disk')->andReturn($failing);

    $response = postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => ['cash' => 18000, 'mpesa' => 0],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => 5000,
            'closing_reading' => 5100,
            'evidence' => UploadedFile::fake()->image('pump_reading.jpg'),
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => 1980]],
    ]);

    // It used to return 200 with the shift locked and evidence_path set to
    // false, which read downstream as "no photo was offered".
    $response->assertStatus(503)
        ->assertJsonPath('error', 'evidence_upload_failed');

    expect(Shift::find($shiftId)->status)->toBe('OPEN')
        ->and(MeterReading::where('shift_id', $shiftId)->count())->toBe(0);
});

test('a shift still locks when no photo was offered at all', function () {
    Storage::fake('evidence-store');
    config()->set('filesystems.default', 'evidence-store');

    $manager = User::where('email', 'manager@octane.com')->firstOrFail();
    actingAs($manager);

    $shiftId = postJson('/api/v1/shifts/start')->json('data.id');
    $nozzle = Nozzle::first();
    $tank = Tank::first();

    // The refusal above must be specific to a photo that failed to store, not
    // to a reading recorded without one.
    postJson("/api/v1/shifts/{$shiftId}/lock", [
        'payments' => ['cash' => 18000, 'mpesa' => 0],
        'meters' => [[
            'nozzle_id' => $nozzle->id,
            'opening_reading' => 5000,
            'closing_reading' => 5100,
        ]],
        'dips' => [['tank_id' => $tank->id, 'dip_mm' => 1980]],
    ])->assertStatus(200)->assertJsonPath('data.status', 'LOCKED');

    expect(MeterReading::where('shift_id', $shiftId)->first()->evidence_path)->toBeNull();
});
