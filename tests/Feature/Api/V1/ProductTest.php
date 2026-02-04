<?php

use App\Models\Organization;
use App\Models\Product;
use App\Models\Tank;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
});

test('admin can create a product with vat', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $data = [
        'name' => 'Super Petrol',
        'current_price' => 179.50,
        'vat_rate' => 16.00
    ];

    postJson('/api/v1/products', $data)
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Super Petrol')
        ->assertJsonPath('data.vat_rate', 16)
        ->assertJsonPath('data.organization_id', $org->id);
});

test('manager cannot create a product', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');
    Sanctum::actingAs($manager);

    $data = Product::factory()->make()->toArray();

    postJson('/api/v1/products', $data)->assertStatus(403);
});

test('admin can update product price', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $product = Product::factory()->create([
        'organization_id' => $org->id,
        'current_price' => 150.00
    ]);

    putJson("/api/v1/products/{$product->id}", ['current_price' => 160.00])
        ->assertOk()
        ->assertJsonPath('data.current_price', 160);
});

test('admin cannot delete product if it is attached to a tank', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $product = Product::factory()->create(['organization_id' => $org->id]);

    // Create a dependency
    Tank::factory()->create([
        'organization_id' => $org->id,
        'product_id' => $product->id
    ]);

    // Attempt delete
    deleteJson("/api/v1/products/{$product->id}")
        ->assertStatus(422) // Unprocessable Entity due to dependency
        ->assertJsonStructure(['errors' => ['id']]);
});

test('admin can delete product if unused', function () {
    $org = Organization::factory()->create();
    $admin = User::factory()->create(['organization_id' => $org->id]);
    $admin->assignRole('admin');
    Sanctum::actingAs($admin);

    $product = Product::factory()->create(['organization_id' => $org->id]);

    deleteJson("/api/v1/products/{$product->id}")
        ->assertOk();

    $this->assertDatabaseMissing('products', ['id' => $product->id]);
});

test('admin cannot view products from other organizations', function () {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $adminA = User::factory()->create(['organization_id' => $orgA->id]);
    $adminA->assignRole('admin');
    Sanctum::actingAs($adminA);

    Product::factory()->create(['organization_id' => $orgB->id]);

    getJson('/api/v1/products')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});
