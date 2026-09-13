<?php

use App\Http\Controllers\ShiftReportController;
use Illuminate\Support\Facades\Route;

// The default welcome view uses @vite, and no Vite build runs in the
// production image — so rendering it there throws. This is a service with no
// public website, so the root simply points at the two things that exist.
Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'admin' => url('/admin'),
        'health' => url('/up'),
    ]);
});

Route::get('/admin/shifts/{shift}/report', [ShiftReportController::class, 'download'])
    ->name('shift.report')
    ->middleware(['web', 'auth']);
