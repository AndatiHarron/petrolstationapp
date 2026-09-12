<?php

use App\Models\Customer;
use App\Models\EditRequest;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create(['organization_id' => $this->organization->id]);
    $this->admin->assignRole('admin');
    $this->user = User::factory()->create(['organization_id' => $this->organization->id]);
    $this->user->assignRole('manager');
});

it('can request an edit for a customer', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);

    Sanctum::actingAs($this->user);

    $response = postJson('/api/v1/edit-requests', [
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'requested_data' => ['name' => 'New Name'],
        'reason' => 'Typo in name',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.requested_data.name', 'New Name');

    $this->assertDatabaseHas('edit_requests', [
        'model_id' => $customer->id,
        'status' => 'pending',
    ]);
});

it('admin can approve an edit request', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);
    $editRequest = EditRequest::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'original_data' => ['name' => 'Old Name'],
        'requested_data' => ['name' => 'Approved Name'],
        'status' => 'pending',
    ]);

    Sanctum::actingAs($this->admin);

    $response = patchJson("/api/v1/edit-requests/{$editRequest->id}", [
        'status' => 'approved',
        'comments' => 'Looks good',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'approved');

    expect($customer->refresh()->name)->toBe('Approved Name');
});

it('admin can reject an edit request', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);
    $editRequest = EditRequest::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'original_data' => ['name' => 'Old Name'],
        'requested_data' => ['name' => 'Rejected Name'],
        'status' => 'pending',
    ]);

    Sanctum::actingAs($this->admin);

    $response = patchJson("/api/v1/edit-requests/{$editRequest->id}", [
        'status' => 'rejected',
        'comments' => 'Invalid name',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'rejected');

    expect($customer->refresh()->name)->toBe('Old Name');
});

it('handles requested_data sent as a list', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);

    Sanctum::actingAs($this->user);

    // Send requested_data as a list containing one object
    $response = postJson('/api/v1/edit-requests', [
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'requested_data' => [['name' => 'List Name']],
        'reason' => 'Testing list format',
    ]);

    $response->assertStatus(201);
    $editRequestId = $response->json('data.id');

    Sanctum::actingAs($this->admin);

    $response = patchJson("/api/v1/edit-requests/{$editRequestId}", [
        'status' => 'approved',
        'comments' => 'Approving list format',
    ]);

    $response->assertStatus(200);
    expect($customer->refresh()->name)->toBe('List Name');
});

it('can approve legacy edit requests stored as a list', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);

    // Manually create a bad record (as if it was created before the fix)
    $editRequest = EditRequest::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'original_data' => [0 => null],
        'requested_data' => [0 => ['name' => 'Legacy Name']],
        'status' => 'pending',
    ]);

    Sanctum::actingAs($this->admin);

    $response = patchJson("/api/v1/edit-requests/{$editRequest->id}", [
        'status' => 'approved',
        'comments' => 'Approving legacy format',
    ]);

    $response->assertStatus(200);
    expect($customer->refresh()->name)->toBe('Legacy Name');
});

it('handles requested_data sent as a list containing a JSON string', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);

    Sanctum::actingAs($this->user);

    // Send requested_data as a list containing a JSON string
    $jsonString = json_encode(['name' => 'JSON Name']);
    $response = postJson('/api/v1/edit-requests', [
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'requested_data' => [$jsonString],
        'reason' => 'Testing JSON string in list',
    ]);

    $response->assertStatus(201);
    $editRequestId = $response->json('data.id');

    Sanctum::actingAs($this->admin);

    $response = patchJson("/api/v1/edit-requests/{$editRequestId}", [
        'status' => 'approved',
        'comments' => 'Approving JSON string format',
    ]);

    $response->assertStatus(200);
    expect($customer->refresh()->name)->toBe('JSON Name');
});

it('non-admin cannot approve an edit request', function () {
    $customer = Customer::factory()->create(['organization_id' => $this->organization->id, 'name' => 'Old Name']);
    $editRequest = EditRequest::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'model_type' => Customer::class,
        'model_id' => $customer->id,
        'original_data' => ['name' => 'Old Name'],
        'requested_data' => ['name' => 'Approved Name'],
        'status' => 'pending',
    ]);

    Sanctum::actingAs($this->user);

    $response = patchJson("/api/v1/edit-requests/{$editRequest->id}", [
        'status' => 'approved',
        'comments' => 'I am not an admin',
    ]);

    $response->assertStatus(403);
});
