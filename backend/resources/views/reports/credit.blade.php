@extends('reports.layout')

@section('content')
    <table class="tiles">
        <tr>
            <td class="tile">
                <div class="label">Customers</div>
                <div class="value">{{ $report['totals']['customer_count'] }}</div>
            </td>
            <td class="tile">
                <div class="label">Charged this period</div>
                <div class="value">{{ number_format($report['totals']['period_charges'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Outstanding</div>
                <div class="value neg">{{ number_format($report['totals']['outstanding'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Over limit</div>
                <div class="value {{ $report['totals']['over_limit_count'] > 0 ? 'neg' : 'pos' }}">
                    {{ $report['totals']['over_limit_count'] }}
                </div>
            </td>
        </tr>
    </table>

    <h2>Credit customers</h2>
    @if (count($report['customers']) === 0)
        <div class="empty">No credit activity or outstanding balances in this period.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th class="num">Opening</th>
                    <th class="num">Charges</th>
                    <th class="num">Invoiced</th>
                    <th class="num">Balance</th>
                    <th class="num">Limit</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['customers'] as $customer)
                    <tr>
                        <td>{{ $customer['customer_name'] }}</td>
                        <td class="muted">{{ $customer['phone'] ?? '-' }}</td>
                        <td class="num">{{ number_format($customer['opening_balance'], 2) }}</td>
                        <td class="num">{{ number_format($customer['period_charges'], 2) }}</td>
                        <td class="num">{{ number_format($customer['invoiced'], 2) }}</td>
                        <td class="num">{{ number_format($customer['current_balance'], 2) }}</td>
                        <td class="num muted">
                            {{ $customer['credit_limit'] > 0 ? number_format($customer['credit_limit'], 2) : 'none' }}
                        </td>
                        <td>
                            @if ($customer['over_limit'])
                                <span class="pill pill-bad">Over limit</span>
                            @elseif (! is_null($customer['utilisation_pct']) && $customer['utilisation_pct'] >= 80)
                                <span class="pill pill-warn">{{ $customer['utilisation_pct'] }}% used</span>
                            @elseif (! is_null($customer['utilisation_pct']))
                                <span class="pill pill-ok">{{ $customer['utilisation_pct'] }}% used</span>
                            @else
                                <span class="muted">-</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td colspan="3">Totals</td>
                    <td class="num">{{ number_format($report['totals']['period_charges'], 2) }}</td>
                    <td class="num">{{ number_format($report['totals']['invoiced'], 2) }}</td>
                    <td class="num">{{ number_format($report['totals']['outstanding'], 2) }}</td>
                    <td colspan="2"></td>
                </tr>
            </tbody>
        </table>
    @endif
@endsection
