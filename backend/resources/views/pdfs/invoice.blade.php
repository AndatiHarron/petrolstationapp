<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice_number }}</title>
    <style>
        body { font-family: sans-serif; }
        .header { text-align: center; margin-bottom: 20px; }
        .invoice-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .total { font-weight: bold; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
        <p>{{ $organization_name }}</p>
        <p>{{ $station_name }}</p>
    </div>

    <div class="invoice-info">
        <p><strong>Invoice Number:</strong> {{ $invoice_number }}</p>
        <p><strong>Customer:</strong> {{ $customer_name }}</p>
        <p><strong>Date:</strong> {{ $date }}</p>
        <p><strong>Shift ID:</strong> {{ $shift_id }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Vehicle Reg</th>
                <th>Notes</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sales as $sale)
            <tr>
                <td>{{ $sale->created_at->format('Y-m-d H:i') }}</td>
                <td>{{ $sale->vehicle_reg ?? 'N/A' }}</td>
                <td>{{ $sale->notes ?? '-' }}</td>
                <td>{{ number_format($sale->amount, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="total">Total</td>
                <td class="total">{{ number_format($total_amount, 2) }}</td>
            </tr>
        </tfoot>
    </table>
</body>
</html>
