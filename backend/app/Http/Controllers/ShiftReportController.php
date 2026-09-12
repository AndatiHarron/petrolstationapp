<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ShiftReportController extends Controller
{
    public function download(Shift $shift) {
        if($shift->organization_id !== auth()->user()->organization_id) {
            abort(403);
        }

        $pdf = Pdf::loadView('reports.shift-summary', [
            'shift' => $shift->load(['payments', 'creditSales.customer', 'meterReadings.nozzle', 'dipReadings.tank']),
            'organization' => $shift->organization,
        ]);

        return $pdf->download("Shift_Report_{$shift->created_at->format('Ymd')}.pdf}");
    }
}
