<?php

use App\Http\Controllers\ShiftReportController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin/shifts/{shift}/report', [ShiftReportController::class, 'download'])
    ->name('shift.report')
    ->middleware(['web', 'auth']);
