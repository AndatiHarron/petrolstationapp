<?php

namespace App\Filament\Widgets;

use App\Models\Shift;
use Filament\Widgets\ChartWidget;
use Flowframe\Trend\Trend;
use Flowframe\Trend\TrendValue;
use Illuminate\Support\Facades\Auth;

class VarianceTrendChart extends ChartWidget
{
    protected int|string|array $columnSpan = 'full';

    protected ?string $heading = 'Cash Variance Trend (Last 7 days)';

    protected static ?int $sort = 2;

    public static function canView(): bool
    {
        return Auth::user()->hasRole(['admin', 'super-admin']);
    }

    protected function getData(): array
    {
        $data = Trend::query(
            Shift::query()
                ->where('organization_id', Auth::user()->organization_id)
                ->whereIn('status', ['LOCKED', 'APPROVED'])
        )
            ->dateColumn('started_at')
            ->between(
                start: now()->subDays(7),
                end: now(),
            )
            ->perDay()
            ->sum('cash_variance');

        return [
            'datasets' => [
                [
                    'label' => 'Cash Variance (KES)',
                    'data' => $data->map(fn (TrendValue $value) => $value->aggregate),
                    'borderColor' => '#ef4444',
                    'backgroundColor' => 'rgba(239, 68, 68, 0.1)',
                    'fill' => true,
                    'tension' => 0.4,
                ],
            ],
            'labels' => $data->map(fn (TrendValue $value) => $value->date),
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
