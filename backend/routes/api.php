<?php

use App\Http\Controllers\Api\V1\AgreementController;
use App\Http\Controllers\Api\V1\ApprovalController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\CreditorController;
use App\Http\Controllers\Api\V1\CreditSaleController;
use App\Http\Controllers\Api\V1\CreditSettlementController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\EditRequestController;
use App\Http\Controllers\Api\V1\LiftingController;
use App\Http\Controllers\Api\V1\NozzleController;
use App\Http\Controllers\Api\V1\OrganizationController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ShiftController;
use App\Http\Controllers\Api\V1\StationController;
use App\Http\Controllers\Api\V1\SupplierSettlementController;
use App\Http\Controllers\Api\V1\TankController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (Auth::attempt($credentials)) {
        $user = Auth::user();

        // Refuse here rather than handing out a token that every subsequent
        // request would reject: the person sees one clear reason instead of a
        // dashboard that fails to load.
        if (
            ! $user->hasRole('super-admin')
            && $user->organization
            && $user->organization->status !== 'active'
        ) {
            Auth::guard('web')->logout();

            return response()->json([
                // A flag the client can branch on, so it never has to match
                // on the wording of the message.
                'error' => 'organization_suspended',
                'message' => 'This organization has been suspended. Contact your provider.',
            ], 403);
        }

        $token = $user->createToken('mobile_app')->plainTextToken;

        return response()->json(
            ['token' => $token]
        );
    }

    return response()->json(['message' => 'Invalid credentials.'], 401);
});

Route::middleware(['auth:sanctum', 'organization.active', 'agreement.accepted'])->prefix('v1')->group(function () {
    Route::get('/user', function (Request $request) {
        return new UserResource($request->user());
    });

    // Reachable before the terms are accepted — see EnsureAgreementAccepted.
    Route::get('/agreement', [AgreementController::class, 'show']);
    Route::post('/agreement/accept', [AgreementController::class, 'accept']);
    Route::post('/agreement/decline', [AgreementController::class, 'decline']);
    Route::get('/agreement/acceptances', [AgreementController::class, 'index']);

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
    Route::apiResource('organizations', OrganizationController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::apiResource('users', UserController::class)->only(['index', 'store', 'show']);

    // Credit Sales: index, create and show
    Route::apiResource('credit-sales', CreditSaleController::class)
        ->only(['index', 'store', 'show']);

    // Clearing customer credit: a manager records the payment, an admin approves.
    Route::apiResource('credit-settlements', CreditSettlementController::class)
        ->only(['index', 'store', 'show']);
    Route::post('/credit-settlements/{creditSettlement}/approve', [CreditSettlementController::class, 'approve']);
    Route::post('/credit-settlements/{creditSettlement}/reject', [CreditSettlementController::class, 'reject']);

    // Paying suppliers down: recorded by whoever pays, approved by an admin.
    Route::apiResource('supplier-settlements', SupplierSettlementController::class)
        ->only(['index', 'store', 'show']);
    Route::post('/supplier-settlements/{supplierSettlement}/approve', [SupplierSettlementController::class, 'approve']);
    Route::post('/supplier-settlements/{supplierSettlement}/reject', [SupplierSettlementController::class, 'reject']);

    // What is waiting for this user to approve, for the in-app badge.
    Route::get('/approvals/summary', [ApprovalController::class, 'summary']);

    // Creditors (Suppliers)
    Route::apiResource('creditors', CreditorController::class);

    Route::prefix('reports')->group(function () {
        Route::get('/debt-aging', [ReportController::class, 'debtAging']);
        Route::get('/pl', [ReportController::class, 'pl']);
        Route::get('/tax-summary', [ReportController::class, 'taxSummary']);
        Route::get('/variance-trend', [ReportController::class, 'varianceTrend']);
        Route::get('/customers/{customer}/statement', [ReportController::class, 'customerStatement']);

        // Composite reports. All five accept ?format=pdf for a download.
        Route::get('/end-of-day', [ReportController::class, 'endOfDay']);
        Route::get('/monthly', [ReportController::class, 'monthly']);
        Route::get('/credit', [ReportController::class, 'credit']);
        Route::get('/users', [ReportController::class, 'users']);
        Route::get('/vat', [ReportController::class, 'vat']);
    });
});
