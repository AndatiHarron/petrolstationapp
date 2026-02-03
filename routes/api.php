<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\ShiftController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if(Auth::attempt($credentials)) {
        $token = Auth::user()->createToken('mobile_app')->plainTextToken;
        return response()->json(
            ['token' => $token]
        );
    }

    return response()->json(['message' => 'Invalid credentials.'], 401);
});


Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/shifts/current', [ShiftController::class, 'index']);
    Route::post('/shifts/start', [ShiftController::class, 'store']);
    Route::post('/shifts/{shift}/lock', [ShiftController::class, 'lock']);
    Route::get('/shifts/{shift}/closing-data', [ShiftController::class, 'closingData']);

    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});


