<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\CreditorController;
use App\Http\Controllers\Api\V1\CreditSaleController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\EditRequestController;
use App\Http\Controllers\Api\V1\LiftingController;
use App\Http\Controllers\Api\V1\NozzleController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ShiftController;
use App\Http\Controllers\Api\V1\StationController;
use App\Http\Controllers\Api\V1\TankController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (Auth::attempt($credentials)) {
        $token = Auth::user()->createToken('mobile_app')->plainTextToken;

        return response()->json(
            ['token' => $token]
        );
    }

    return response()->json(['message' => 'Invalid credentials.'], 401);
});

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::get('/user', function (Request $request) {
        return new UserResource($request->user());
    });

    Route::get('/shifts', [ShiftController::class, 'index']);
    Route::get('/shifts/current', [ShiftController::class, 'current']);
    Route::get('/shifts/{shift}', [ShiftController::class, 'show']);
    Route::post('/shifts/start', [ShiftController::class, 'store']);
    Route::post('/shifts/{shift}/lock', [ShiftController::class, 'lock']);
    Route::get('/shifts/{shift}/closing-data', [ShiftController::class, 'closingData']);
    Route::get('/shifts/{shift}/invoice-data', [ShiftController::class, 'invoiceData']);
    Route::get('/shifts/{shift}/invoices', [ShiftController::class, 'invoices']);
    Route::post('/shifts/{shift}/generate-invoices', [ShiftController::class, 'generateInvoices']);
    Route::get('/invoices/{invoice}/download', [ShiftController::class, 'downloadInvoice'])->name('invoices.download');

    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::get('/audit-logs/{activity}', [AuditLogController::class, 'show']);

    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('edit-requests', EditRequestController::class)->only(['index', 'store', 'show', 'update']);
    Route::apiResource('liftings', LiftingController::class);
    Route::apiResource('stations', StationController::class);
    Route::apiResource('tanks', TankController::class);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('nozzles', NozzleController::class);

    // Credit Sales: index, create and show
    Route::apiResource('credit-sales', CreditSaleController::class)
        ->only(['index', 'store', 'show']);

    // Creditors (Suppliers)
    Route::apiResource('creditors', CreditorController::class);

    Route::prefix('reports')->group(function () {
        Route::get('/debt-aging', [ReportController::class, 'debtAging']);
        Route::get('/pl', [ReportController::class, 'pl']);
        Route::get('/tax-summary', [ReportController::class, 'taxSummary']);
        Route::get('/variance-trend', [ReportController::class, 'varianceTrend']);
    });
});
