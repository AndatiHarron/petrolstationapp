@extends('reports.layout')

@section('content')
    <table class="tiles">
        <tr>
            <td class="tile">
                <div class="label">Litres sold</div>
                <div class="value">{{ number_format($report['totals']['liters_sold'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Sales value</div>
                <div class="value">{{ number_format($report['totals']['expected_cash'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Purchases</div>
                <div class="value">{{ number_format($report['purchases']['total_cost'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Gross margin</div>
                <div class="value {{ $report['gross_margin'] < 0 ? 'neg' : 'pos' }}">
                    {{ number_format($report['gross_margin'], 2) }}
                </div>
            </td>
        </tr>
    </table>

    <h2>Month at a glance</h2>
    <table class="data">
        <tr><td>Shifts worked</td><td class="num">{{ $report['totals']['shift_count'] }}</td></tr>
        <tr><td>Days traded</td><td class="num">{{ $report['days_traded'] }}</td></tr>
        <tr><td>Cash collected</td><td class="num">{{ number_format($report['totals']['collected_cash'], 2) }}</td></tr>
        <tr>
            <td>Cash variance</td>
            <td class="num {{ $report['totals']['cash_variance'] < 0 ? 'neg' : '' }}">
                {{ number_format($report['totals']['cash_variance'], 2) }}
            </td>
        </tr>
        <tr>
            <td>Stock variance (litres)</td>
            <td class="num {{ $report['totals']['stock_variance_liters'] < 0 ? 'neg' : '' }}">
                {{ number_format($report['totals']['stock_variance_liters'], 2) }}
            </td>
        </tr>
    </table>

    <h2>Payments received</h2>
    <table class="data">
        <tr><td>Cash</td><td class="num">{{ number_format($report['payments']['cash'], 2) }}</td></tr>
        <tr><td>M-Pesa</td><td class="num">{{ number_format($report['payments']['mpesa'], 2) }}</td></tr>
        <tr><td>Credit</td><td class="num">{{ number_format($report['payments']['credit'], 2) }}</td></tr>
        <tr class="total">
            <td>Total</td>
            <td class="num">{{ number_format($report['totals']['collected_cash'], 2) }}</td>
        </tr>
    </table>

    <h2>Fuel purchased</h2>
    <table class="data">
        <tr><td>Deliveries</td><td class="num">{{ $report['purchases']['lifting_count'] }}</td></tr>
        <tr><td>Litres received</td><td class="num">{{ number_format($report['purchases']['liters_received'], 2) }}</td></tr>
        <tr><td>Total cost</td><td class="num">{{ number_format($report['purchases']['total_cost'], 2) }}</td></tr>
        <tr><td>VAT paid on purchases</td><td class="num">{{ number_format($report['purchases']['tax_paid'], 2) }}</td></tr>
    </table>

    <h2>VAT position</h2>
    <table class="data">
        <tr><td>VAT collected on sales</td><td class="num">{{ number_format($report['totals']['tax_collected'], 2) }}</td></tr>
        <tr><td>VAT paid on purchases</td><td class="num">{{ number_format($report['purchases']['tax_paid'], 2) }}</td></tr>
        <tr class="total">
            <td>{{ $report['net_vat'] >= 0 ? 'Net VAT payable' : 'Net VAT reclaimable' }}</td>
            <td class="num">{{ number_format(abs($report['net_vat']), 2) }}</td>
        </tr>
    </table>

    <h2>Daily breakdown</h2>
    @if (count($report['daily']) === 0)
        <div class="empty">No trading recorded this month.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>Date</th>
                    <th class="num">Shifts</th>
                    <th class="num">Litres</th>
                    <th class="num">Expected</th>
                    <th class="num">Collected</th>
                    <th class="num">Variance</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['daily'] as $day)
                    <tr>
                        <td>{{ $day['date'] }}</td>
                        <td class="num">{{ $day['shift_count'] }}</td>
                        <td class="num">{{ number_format($day['liters_sold'], 2) }}</td>
                        <td class="num">{{ number_format($day['expected_cash'], 2) }}</td>
                        <td class="num">{{ number_format($day['collected_cash'], 2) }}</td>
                        <td class="num {{ $day['cash_variance'] < 0 ? 'neg' : '' }}">
                            {{ number_format($day['cash_variance'], 2) }}
                        </td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td>Month total</td>
                    <td class="num">{{ $report['totals']['shift_count'] }}</td>
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
@endsection
