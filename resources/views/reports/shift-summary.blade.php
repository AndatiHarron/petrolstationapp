<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Shift Report #{{ $shift->id }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { width: 100%; border-bottom: 2px solid #444; padding-bottom: 10px; margin-bottom: 20px; }
        .logo { font-size: 20px; font-weight: bold; text-transform: uppercase; }
        .sub-header { float: right; text-align: right; }

        .section-title {
            background-color: #f3f4f6;
            padding: 5px;
            font-weight: bold;
            border-left: 4px solid #f59e0b; /* Orange accent */
            margin-top: 20px;
            margin-bottom: 10px;
        }

        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f9fafb; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-danger { color: #dc2626; font-weight: bold; }
        .text-success { color: #16a34a; font-weight: bold; }

        .variance-box {
            border: 2px solid #000;
            padding: 10px;
            margin-top: 20px;
            page-break-inside: avoid;
        }

        .signatures { margin-top: 50px; width: 100%; }
        .sig-line { border-top: 1px solid #000; width: 40%; display: inline-block; padding-top: 5px; }
    </style>
</head>
<body>

<div class="header">
    <div class="logo">{{ $organization->name }}</div>
    <div class="sub-header">
        <strong>Station:</strong> {{ $shift->station->name }}<br>
        <strong>Date:</strong> {{ $shift->started_at->format('d M Y') }}<br>
        <strong>Status:</strong> {{ strtoupper($shift->status) }}
    </div>
    <div style="clear: both;"></div>
</div>

<h2 style="text-align: center;">Shift Reconciliation Report</h2>

<div class="section-title">1. Pump Sales (Meter Readings)</div>
<table>
    <thead>
    <tr>
        <th>Nozzle</th>
        <th>Product</th>
        <th class="text-right">Opening</th>
        <th class="text-right">Closing</th>
        <th class="text-right">Sold (L)</th>
        <th class="text-right">Amount (KES)</th>
    </tr>
    </thead>
    <tbody>
    @foreach($shift->meterReadings as $reading)
        <tr>
            <td>{{ $reading->nozzle->name }}</td>
            <td>{{ $reading->nozzle->tank->product->name ?? 'N/A' }}</td>
            <td class="text-right">{{ number_format($reading->opening_reading, 2) }}</td>
            <td class="text-right">{{ number_format($reading->closing_reading, 2) }}</td>
            <td class="text-right">{{ number_format($reading->volume_sold, 2) }}</td>
            <td class="text-right">{{ number_format($reading->total_value, 2) }}</td>
        </tr>
    @endforeach
    </tbody>
    <tfoot>
    <tr style="background-color: #eee; font-weight: bold;">
        <td colspan="4" class="text-right">TOTAL</td>
        <td class="text-right">{{ number_format($shift->total_stock_sold_liters, 2) }}</td>
        <td class="text-right">{{ number_format($shift->total_expected_cash, 2) }}</td>
    </tr>
    </tfoot>
</table>

<div class="section-title">2. Stock Reconciliation (Dip Readings)</div>
<table>
    <thead>
    <tr>
        <th>Tank</th>
        <th>Dip (mm)</th>
        <th class="text-right">Physical Vol (L)</th>
        <th class="text-right">Book Balance (L)</th>
        <th class="text-right">Variance (L)</th>
    </tr>
    </thead>
    <tbody>
    @foreach($shift->dipReadings as $dip)
        @php
            // Logic: We don't store "Book Balance" in dip_readings table usually,
            // but we can infer it or just show the physical vs sales.
            // For this report, we'll focus on the variance calculated.
            // You might want to pass calculated arrays from controller if needed complex logic.
            $tank = $dip->tank;
        @endphp
        <tr>
            <td>{{ $tank->name }}</td>
            <td>{{ $dip->dip_mm }} mm</td>
            <td class="text-right">{{ number_format($dip->volume_liters, 2) }}</td>
            <td class="text-center">-</td> <td class="text-right {{ $shift->stock_variance_liters < 0 ? 'text-danger' : '' }}">
                {{-- Note: This is a global variance, ideally we split per tank --}}
                -
            </td>
        </tr>
    @endforeach
    </tbody>
    <tfoot>
    <tr style="background-color: #eee; font-weight: bold;">
        <td colspan="4" class="text-right">NET STOCK VARIANCE</td>
        <td class="text-right {{ $shift->stock_variance_liters < 0 ? 'text-danger' : 'text-success' }}">
            {{ number_format($shift->stock_variance_liters, 2) }} L
        </td>
    </tr>
    </tfoot>
</table>

<div class="section-title">3. Collections & Payments</div>

<table style="width: 50%; float: left; margin-right: 10px;">
    <thead>
    <tr>
        <th colspan="2">Declared Collections</th>
    </tr>
    </thead>
    <tbody>
    @foreach($shift->payments as $payment)
        <tr>
            <td>{{ ucfirst($payment->method) }}</td>
            <td class="text-right">{{ number_format($payment->amount, 2) }}</td>
        </tr>
    @endforeach
    <tr style="font-weight: bold; border-top: 2px solid #000;">
        <td>Total Declared</td>
        <td class="text-right">{{ number_format($shift->total_collected_cash, 2) }}</td>
    </tr>
    </tbody>
</table>

<table style="width: 48%; float: right;">
    <thead>
    <tr>
        <th colspan="3">Credit Sales (Debtors)</th>
    </tr>
    <tr>
        <th style="font-size: 10px;">Customer</th>
        <th style="font-size: 10px;">Reg</th>
        <th style="font-size: 10px;" class="text-right">Amt</th>
    </tr>
    </thead>
    <tbody>
    @forelse($shift->creditSales as $sale)
        <tr>
            <td style="font-size: 10px;">{{ $sale->customer->name }}</td>
            <td style="font-size: 10px;">{{ $sale->vehicle_reg ?? '-' }}</td>
            <td style="font-size: 10px;" class="text-right">{{ number_format($sale->amount, 0) }}</td>
        </tr>
    @empty
        <tr><td colspan="3" class="text-center">No Credit Sales</td></tr>
    @endforelse
    </tbody>
</table>
<div style="clear: both;"></div>

<div class="variance-box">
    <table style="border: none;">
        <tr style="border: none;">
            <td style="border: none; width: 50%;">
                <strong>Total Expected Revenue:</strong><br>
                <span style="font-size: 14px;">KES {{ number_format($shift->total_expected_cash, 2) }}</span>
            </td>
            <td style="border: none; width: 50%; text-align: right;">
                <strong>CASH VARIANCE:</strong><br>
                <span style="font-size: 18px; {{ $shift->cash_variance < 0 ? 'color: red;' : 'color: green;' }}">
                        KES {{ number_format($shift->cash_variance, 2) }}
                    </span>
            </td>
        </tr>
    </table>
</div>

<div class="signatures">
    <div style="float: left; width: 45%;">
        <div class="sig-line"></div><br>
        <strong>Attendant Signature</strong><br>
        <small>Confirming handover of cash</small>
    </div>
    <div style="float: right; width: 45%; text-align: right;">
        <div class="sig-line"></div><br>
        <strong>Manager Signature</strong><br>
        <small>Confirming receipt of cash</small>
    </div>
    <div style="clear: both;"></div>
</div>

<div style="text-align: center; margin-top: 30px; color: #777; font-size: 10px;">
    Generated by Petrol Integrity System on {{ now()->format('d M Y H:i') }}
</div>

</body>
</html>
