<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\CreditSaleController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\LiftingController;
use App\Http\Controllers\Api\V1\NozzleController;
use App\Http\Controllers\Api\V1\ProductController;
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

    Route::get('/shifts/current', [ShiftController::class, 'index']);
    Route::post('/shifts/start', [ShiftController::class, 'store']);
    Route::post('/shifts/{shift}/lock', [ShiftController::class, 'lock']);
    Route::get('/shifts/{shift}/closing-data', [ShiftController::class, 'closingData']);

    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::get('/audit-logs/{activity}', [AuditLogController::class, 'show']);

    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('liftings', LiftingController::class);
    Route::apiResource('stations', StationController::class);
    Route::apiResource('tanks', TankController::class);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('nozzles', NozzleController::class);

    // Credit Sales: index, create and show
    Route::apiResource('credit-sales', CreditSaleController::class)
        ->only(['index', 'store', 'show']);
});
