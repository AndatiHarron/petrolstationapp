<?php

namespace App\Filament\Widgets;

use App\Models\Lifting;
use App\Models\Shift;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Auth;

class TaxLiabilityStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        $orgId = Auth::user()->organization_id;

        $outputTax = Shift::where('organization_id', $orgId)
            ->whereIn('status', ['LOCKED', 'APPROVED'])
            ->sum('total_tax_collected');

        $inputTax = Lifting::where('organization_id', $orgId)
            ->sum('tax_paid');

        $netLiability = $outputTax - $inputTax;

        return [
            Stat::make('Output VAT (Sales)', number_format($outputTax, 2, '.', ','))
                ->description('Tax collected from pumps')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('warning'),

            Stat::make('Input VAT (Purchases)', number_format($outputTax, 2, '.', ','))
                ->description('Tax paid on liftings')
                ->descriptionIcon('heroicon-m-arrow-trending-down')
                ->color('success'),

            Stat::make('Net Tax Liability', number_format($netLiability, 2, '.', ','))
                ->description($netLiability > 0 ? 'Payable to authority' : 'Claimable refund')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color($netLiability > 0 ? 'danger' : 'success'),
        ];
    }
}
