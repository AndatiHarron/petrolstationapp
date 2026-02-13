<?php

use App\Models\CreditSale;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\seed;

uses(RefreshDatabase::class);

beforeEach(function () {
    seed(RolesAndPermissionsSeeder::class);
    $this->org = Organization::factory()->create();
    $this->station = Station::factory()->create(['organization_id' => $this->org->id]);
    $this->user = User::factory()->create(['organization_id' => $this->org->id, 'station_id' => $this->station->id]);
    $this->user->assignRole('admin');
    Sanctum::actingAs($this->user);

    $this->shift = Shift::create([
        'organization_id' => $this->org->id,
        'station_id' => $this->station->id,
        'started_by_user_id' => $this->user->id,
        'status' => Shift::STATUS_LOCKED,
        'started_at' => now()->subHours(8),
        'locked_at' => now(),
    ]);

    $this->customer = Customer::factory()->create(['organization_id' => $this->org->id, 'name' => 'Test Customer']);

    CreditSale::create([
        'organization_id' => $this->org->id,
        'shift_id' => $this->shift->id,
        'customer_id' => $this->customer->id,
        'amount' => 1000,
        'vehicle_reg' => 'KAA 001A',
        'notes' => 'Diesel',
    ]);

    CreditSale::create([
        'organization_id' => $this->org->id,
        'shift_id' => $this->shift->id,
        'customer_id' => $this->customer->id,
        'amount' => 500,
        'vehicle_reg' => 'KAA 002B',
        'notes' => 'Petrol',
    ]);
});

it('can fetch invoice data for a locked shift', function () {
    $response = getJson("/api/v1/shifts/{$this->shift->id}/invoice-data");

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'customer_id',
                    'customer_name',
                    'total_amount',
                    'sales' => [
                        '*' => [
                            'id',
                            'amount',
                            'vehicle_reg',
                            'notes',
                            'created_at',
                        ],
                    ],
                ],
            ],
        ])
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.customer_name', 'Test Customer')
        ->assertJsonPath('data.0.total_amount', 1500);
});

it('cannot fetch invoice data for an open shift', function () {
    $this->shift->update(['status' => Shift::STATUS_OPEN]);

    $response = getJson("/api/v1/shifts/{$this->shift->id}/invoice-data");

    $response->assertStatus(422);
});

it('can generate invoices for a locked shift', function () {
    Storage::fake('local');

    $response = postJson("/api/v1/shifts/{$this->shift->id}/generate-invoices");

    $response->assertOk()
        ->assertJsonStructure(['message', 'invoices']);

    $this->assertDatabaseHas('invoices', [
        'shift_id' => $this->shift->id,
        'customer_id' => $this->customer->id,
        'total_amount' => 1500,
    ]);

    $invoice = \App\Models\Invoice::where('shift_id', $this->shift->id)->first();
    Storage::disk('local')->assertExists($invoice->pdf_path);
});

it('is idempotent when generating invoices', function () {
    Storage::fake('local');

    // Generate once
    postJson("/api/v1/shifts/{$this->shift->id}/generate-invoices")->assertOk();
    $count = \App\Models\Invoice::count();

    // Generate again
    $response = postJson("/api/v1/shifts/{$this->shift->id}/generate-invoices");
    $response->assertOk();

    expect(\App\Models\Invoice::count())->toBe($count);
});

it('can fetch existing invoices for a shift', function () {
    $invoiceNumber = 'INV-EXISTING';
    \App\Models\Invoice::create([
        'organization_id' => $this->org->id,
        'shift_id' => $this->shift->id,
        'customer_id' => $this->customer->id,
        'invoice_number' => $invoiceNumber,
        'total_amount' => 1500,
        'pdf_path' => 'invoices/existing.pdf',
    ]);

    $response = getJson("/api/v1/shifts/{$this->shift->id}/invoices");

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'invoice_number',
                    'total_amount',
                    'customer_name',
                    'download_url',
                    'created_at',
                ],
            ],
        ])
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.invoice_number', $invoiceNumber);
});

it('can download an invoice', function () {
    Storage::fake('local');
    $invoiceNumber = 'INV-TEST1234';
    $path = "invoices/{$invoiceNumber}.pdf";
    Storage::disk('local')->put($path, 'fake pdf content');

    $invoice = \App\Models\Invoice::create([
        'organization_id' => $this->org->id,
        'shift_id' => $this->shift->id,
        'customer_id' => $this->customer->id,
        'invoice_number' => $invoiceNumber,
        'total_amount' => 1500,
        'pdf_path' => $path,
    ]);

    $response = getJson("/api/v1/invoices/{$invoice->id}/download");

    $response->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename='.$invoiceNumber.'.pdf');
});
