<?php

use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::create(['name' => 'super-admin']);
});

it('includes readings and dips when they are loaded', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');
    $station = Station::factory()->create();
    $shift = Shift::factory()->create([
        'started_by_user_id' => $user->id,
        'station_id' => $station->id,
    ]);

    $shift->load(['meterReadings', 'dipReadings']);

    $response = $this->actingAs($user)->getJson("/api/v1/shifts/{$shift->id}");

    if ($response->status() !== 200) {
        dump($response->json());
    }

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'id',
                'readings',
                'dips',
            ],
        ]);
});

it('includes readings and dips when they are loaded in index', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');
    $station = Station::factory()->create();
    $user->update(['station_id' => $station->id]);

    Shift::factory()->create([
        'started_by_user_id' => $user->id,
        'station_id' => $station->id,
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/shifts');

    $response->assertStatus(200);
    $data = $response->json('data.0');

    expect($data)->toHaveKey('readings');
    expect($data)->toHaveKey('dips');
});

it('includes readings and dips when they are loaded in current', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');
    $station = Station::factory()->create();
    $user->update(['station_id' => $station->id]);

    Shift::factory()->create([
        'started_by_user_id' => $user->id,
        'station_id' => $station->id,
        'status' => 'OPEN',
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/shifts/current');

    $response->assertStatus(200);
    $data = $response->json('data');

    expect($data)->toHaveKey('readings');
    expect($data)->toHaveKey('dips');
});
