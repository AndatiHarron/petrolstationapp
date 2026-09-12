@extends('reports.layout')

@section('content')
    <table class="tiles">
        <tr>
            <td class="tile">
                <div class="label">Attendants</div>
                <div class="value">{{ $report['totals']['user_count'] }}</div>
            </td>
            <td class="tile">
                <div class="label">Shifts worked</div>
                <div class="value">{{ $report['totals']['shift_count'] }}</div>
            </td>
            <td class="tile">
                <div class="label">Total variance</div>
                <div class="value {{ $report['totals']['cash_variance'] < 0 ? 'neg' : 'pos' }}">
                    {{ number_format($report['totals']['cash_variance'], 2) }}
                </div>
            </td>
            <td class="tile">
                <div class="label">Period</div>
                <div class="value" style="font-size: 9px">
                    {{ $report['start_date'] }}<br>{{ $report['end_date'] }}
                </div>
            </td>
        </tr>
    </table>

    <h2>Attendant performance</h2>
    <p class="meta" style="margin: 0 0 8px">
        Ordered by cash variance, worst first. A persistent negative variance against one
        attendant is the pattern this report exists to surface; a single bad shift is not.
    </p>

    @if (count($report['users']) === 0)
        <div class="empty">No shifts recorded in this period.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>Attendant</th>
                    <th class="num">Shifts</th>
                    <th class="num">Litres</th>
                    <th class="num">Expected</th>
                    <th class="num">Collected</th>
                    <th class="num">Variance</th>
                    <th class="num">Avg / shift</th>
                    <th class="num">Stock var.</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['users'] as $user)
                    <tr>
                        <td>{{ $user['user_name'] }}</td>
                        <td class="num">{{ $user['shift_count'] }}</td>
                        <td class="num">{{ number_format($user['liters_sold'], 2) }}</td>
                        <td class="num">{{ number_format($user['expected_cash'], 2) }}</td>
                        <td class="num">{{ number_format($user['collected_cash'], 2) }}</td>
                        <td class="num {{ $user['cash_variance'] < 0 ? 'neg' : '' }}">
                            {{ number_format($user['cash_variance'], 2) }}
                        </td>
                        <td class="num {{ $user['avg_variance_per_shift'] < 0 ? 'neg' : 'muted' }}">
                            {{ number_format($user['avg_variance_per_shift'], 2) }}
                        </td>
                        <td class="num {{ $user['stock_variance_liters'] < 0 ? 'neg' : 'muted' }}">
                            {{ number_format($user['stock_variance_liters'], 2) }}
                        </td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td>Totals</td>
                    <td class="num">{{ $report['totals']['shift_count'] }}</td>
                    <td colspan="3"></td>
                    <td class="num {{ $report['totals']['cash_variance'] < 0 ? 'neg' : '' }}">
                        {{ number_format($report['totals']['cash_variance'], 2) }}
                    </td>
                    <td colspan="2"></td>
                </tr>
            </tbody>
        </table>
    @endif
@endsection
