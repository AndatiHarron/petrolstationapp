@extends('reports.layout')

@section('content')
    <table class="tiles">
        <tr>
            <td class="tile">
                <div class="label">Output VAT (sales)</div>
                <div class="value">{{ number_format($report['totals']['tax_collected'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">Input VAT (purchases)</div>
                <div class="value">{{ number_format($report['totals']['tax_paid'], 2) }}</div>
            </td>
            <td class="tile">
                <div class="label">{{ $report['totals']['payable'] ? 'Net payable' : 'Net reclaimable' }}</div>
                <div class="value {{ $report['totals']['payable'] ? 'neg' : 'pos' }}">
                    {{ number_format(abs($report['totals']['net_tax']), 2) }}
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

    <h2>VAT position</h2>
    <table class="data">
        <tr>
            <td>Taxable sales (VAT inclusive)</td>
            <td class="num">{{ number_format($report['totals']['taxable_sales'], 2) }}</td>
        </tr>
        <tr>
            <td>Output VAT collected on sales</td>
            <td class="num">{{ number_format($report['totals']['tax_collected'], 2) }}</td>
        </tr>
        <tr>
            <td>Taxable purchases (VAT inclusive)</td>
            <td class="num">{{ number_format($report['totals']['taxable_purchases'], 2) }}</td>
        </tr>
        <tr>
            <td>Input VAT paid on purchases</td>
            <td class="num">{{ number_format($report['totals']['tax_paid'], 2) }}</td>
        </tr>
        <tr class="total">
            <td>{{ $report['totals']['payable'] ? 'Net VAT payable' : 'Net VAT reclaimable' }}</td>
            <td class="num">{{ number_format(abs($report['totals']['net_tax']), 2) }}</td>
        </tr>
    </table>

    <h2>Month by month</h2>
    @if (count($report['periods']) === 0)
        <div class="empty">No VAT activity in this period.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>Period</th>
                    <th class="num">Output VAT</th>
                    <th class="num">Input VAT</th>
                    <th class="num">Net</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['periods'] as $period)
                    <tr>
                        <td>{{ $period['label'] }}</td>
                        <td class="num">{{ number_format($period['tax_collected'], 2) }}</td>
                        <td class="num">{{ number_format($period['tax_paid'], 2) }}</td>
                        <td class="num {{ $period['net_tax'] < 0 ? 'pos' : '' }}">
                            {{ number_format($period['net_tax'], 2) }}
                        </td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td>Total</td>
                    <td class="num">{{ number_format($report['totals']['tax_collected'], 2) }}</td>
                    <td class="num">{{ number_format($report['totals']['tax_paid'], 2) }}</td>
                    <td class="num">{{ number_format($report['totals']['net_tax'], 2) }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    <p class="meta" style="margin-top: 14px">
        VAT is charged inside the pump price, so output tax is derived as
        <em>total &minus; (total &divide; 1 + rate)</em> rather than as a percentage added on top.
        This document is a working summary, not a filed return.
    </p>
@endsection
