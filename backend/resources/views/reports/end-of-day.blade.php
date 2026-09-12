@extends('reports.layout')

@section('content')
    <table class="tiles">
        <tr>
            <td class="tile">
                <div class="label">Litres sold</div>
                <div class="value">{{ number_format($report['totals']['liters_sold'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Expected cash</div>
                <div class="value">{{ number_format($report['totals']['expected_cash'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Collected</div>
                <div class="value">{{ number_format($report['totals']['collected_cash'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Cash variance</div>
                <div class="value {{ $report['totals']['cash_variance'] < 0 ? 'neg' : 'pos' }}">
                    {{ number_format($report['totals']['cash_variance'], 2) }}
                </div>
            </td>
        </tr>
    </table>

    <h2>Money collected</h2>
    <table class="data">
        <tr><td>Cash</td><td class="num">{{ number_format($report['payments']['cash'], 2) }}</td></tr>
        <tr><td>M-Pesa</td><td class="num">{{ number_format($report['payments']['mpesa'], 2) }}</td></tr>
        <tr><td>Credit</td><td class="num">{{ number_format($report['payments']['credit'], 2) }}</td></tr>
        <tr class="total">
            <td>Total collected</td>
            <td class="num">{{ number_format($report['totals']['collected_cash'], 2) }}</td>
        </tr>
    </table>

    <h2>Shifts ({{ $report['totals']['shift_count'] }})</h2>
    @if (count($report['shifts']) === 0)
        <div class="empty">No shifts recorded on this day.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>Shift</th>
                    <th>Station</th>
                    <th>Attendant</th>
                    <th>Open</th>
                    <th>Close</th>
                    <th class="num">Litres</th>
                    <th class="num">Expected</th>
                    <th class="num">Collected</th>
                    <th class="num">Variance</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['shifts'] as $shift)
                    <tr>
                        <td>{{ $shift['shift_number'] ?? '—' }}</td>
                        <td>{{ $shift['station_name'] ?? '—' }}</td>
                        <td>{{ $shift['attendant'] ?? '—' }}</td>
                        <td class="muted">{{ $shift['started_at'] ?? '—' }}</td>
                        <td class="muted">{{ $shift['locked_at'] ?? 'open' }}</td>
                        <td class="num">{{ number_format($shift['liters_sold'], 2) }}</td>
                        <td class="num">{{ number_format($shift['expected_cash'], 2) }}</td>
                        <td class="num">{{ number_format($shift['collected_cash'], 2) }}</td>
                        <td class="num {{ $shift['cash_variance'] < 0 ? 'neg' : '' }}">
                            {{ number_format($shift['cash_variance'], 2) }}
                        </td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td colspan="5">Day total</td>
                    <td class="num">{{ number_format($report['totals']['liters_sold'], 2) }}</td>
                    <td class="num">{{ number_format($report['totals']['expected_cash'], 2) }}</td>
                    <td class="num">{{ number_format($report['totals']['collected_cash'], 2) }}</td>
                    <td class="num {{ $report['totals']['cash_variance'] < 0 ? 'neg' : '' }}">
                        {{ number_format($report['totals']['cash_variance'], 2) }}
                    </td>
                </tr>
            </tbody>
        </table>
    @endif

    <h2>Wet stock &amp; tax</h2>
    <table class="data">
        <tr>
            <td>Stock variance (litres)</td>
            <td class="num {{ $report['totals']['stock_variance_liters'] < 0 ? 'neg' : '' }}">
                {{ number_format($report['totals']['stock_variance_liters'], 2) }}
            </td>
        </tr>
        <tr>
            <td>VAT collected</td>
            <td class="num">{{ number_format($report['totals']['tax_collected'], 2) }}</td>
        </tr>
    </table>

    @if (count($report['credit_sales']) > 0)
        <h2>Credit sales ({{ count($report['credit_sales']) }})</h2>
        <table class="data">
            <thead>
                <tr><th>Customer</th><th>Vehicle</th><th class="num">Amount</th></tr>
            </thead>
            <tbody>
                @foreach ($report['credit_sales'] as $sale)
                    <tr>
                        <td>{{ $sale['customer_name'] ?? '—' }}</td>
                        <td class="muted">{{ $sale['vehicle_reg'] ?? '—' }}</td>
                        <td class="num">{{ number_format($sale['amount'], 2) }}</td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td colspan="2">Total on credit</td>
                    <td class="num">{{ number_format($report['credit_total'], 2) }}</td>
                </tr>
            </tbody>
        </table>
    @endif
@endsection
