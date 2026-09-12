import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/lib/axios';
import {
    reportDebtAging,
    reportPl,
    reportTaxSummary,
    reportVarianceTrend,
} from '@/features/api/report/report';
import type {
    CreditReport,
    CustomerStatement,
    DebtAgingReport,
    EndOfDayReport,
    MonthlyReport,
    PeriodPresetId,
    ProfitAndLossReport,
    ReportFilters,
    TaxSummaryReport,
    UserReport,
    VarianceTrendReport,
    VatReport,
} from './types';

export * from './types';

/** YYYY-MM-DD in local time. toISOString() would shift the date across UTC. */
function isoDate(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

export const PERIOD_PRESETS: { id: PeriodPresetId; label: string }[] = [
    { id: 'this_month', label: 'This month' },
    { id: 'last_month', label: 'Last month' },
    { id: 'last_7', label: 'Last 7 days' },
    { id: 'last_30', label: 'Last 30 days' },
    { id: 'last_90', label: 'Last 90 days' },
    { id: 'this_year', label: 'This year' },
];

/** Resolve a named period to the concrete dates the API expects. */
export function resolvePeriod(preset: PeriodPresetId): { start_date: string; end_date: string } {
    const today = new Date();

    const daysBack = (n: number) => {
        const from = new Date(today);
        from.setDate(from.getDate() - (n - 1));
        return { start_date: isoDate(from), end_date: isoDate(today) };
    };

    switch (preset) {
        case 'last_7':
            return daysBack(7);
        case 'last_30':
            return daysBack(30);
        case 'last_90':
            return daysBack(90);
        case 'last_month': {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            return { start_date: isoDate(first), end_date: isoDate(last) };
        }
        case 'this_year':
            return {
                start_date: isoDate(new Date(today.getFullYear(), 0, 1)),
                end_date: isoDate(today),
            };
        case 'this_month':
        case 'custom':
        default:
            return {
                start_date: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                end_date: isoDate(today),
            };
    }
}

/** Drop empty keys so they don't reach the API as `?station_id=`. */
function clean<T extends object>(filters: T): Record<string, string> {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Record<string, string>;
}

export function formatPeriod(filters: ReportFilters): string {
    if (!filters.start_date || !filters.end_date) return 'All time';

    const fmt = (iso: string) =>
        new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

    return filters.start_date === filters.end_date
        ? fmt(filters.start_date)
        : `${fmt(filters.start_date)} – ${fmt(filters.end_date)}`;
}

// ─── Hooks ────────────────────────────────────────────────────────
// Thin wrappers over the generated functions that accept the full filter set.

export function useProfitAndLoss(filters: ReportFilters) {
    const params = clean(filters);
    return useQuery({
        queryKey: ['report', 'pl', params],
        queryFn: () => reportPl(params as never) as unknown as Promise<ProfitAndLossReport>,
    });
}

export function useTaxSummary(filters: ReportFilters) {
    const params = clean(filters);
    return useQuery({
        queryKey: ['report', 'tax-summary', params],
        queryFn: () => reportTaxSummary(params as never) as unknown as Promise<TaxSummaryReport>,
    });
}

export function useDebtAging(filters: ReportFilters) {
    const params = clean(filters);
    return useQuery({
        queryKey: ['report', 'debt-aging', params],
        queryFn: () => reportDebtAging(params as never) as unknown as Promise<DebtAgingReport>,
    });
}

export function useVarianceTrend(filters: ReportFilters) {
    const params = clean(filters);
    return useQuery({
        queryKey: ['report', 'variance-trend', params],
        queryFn: () => reportVarianceTrend(params as never) as unknown as Promise<VarianceTrendReport>,
    });
}

/**
 * Per-customer statement. Hand-written because this endpoint postdates the last
 * Orval run; regenerating the client will supersede it.
 */
export function useCustomerStatement(customerId: string | null, filters: ReportFilters) {
    const params = clean(filters);
    return useQuery({
        queryKey: ['report', 'customer-statement', customerId, params],
        enabled: !!customerId,
        queryFn: () => {
            const query = new URLSearchParams(params).toString();
            const suffix = query ? `?${query}` : '';
            return customInstance<CustomerStatement>(
                `/v1/reports/customers/${customerId}/statement${suffix}`,
                { method: 'GET' }
            );
        },
    });
}

// ─── Composite report hooks ───────────────────────────────────────

function compositeQuery<T>(slug: string, params: Record<string, string>) {
    return {
        queryKey: ['report', slug, params] as const,
        queryFn: () => {
            const query = new URLSearchParams(params).toString();
            return customInstance<T>(`/v1/reports/${slug}${query ? `?${query}` : ''}`, {
                method: 'GET',
            });
        },
    };
}

/** One calendar day, every shift on it combined. */
export function useEndOfDay(date: string, stationId?: string) {
    return useQuery(
        compositeQuery<EndOfDayReport>('end-of-day', clean({ date, station_id: stationId }))
    );
}

export function useMonthlyReport(month: number, year: number, stationId?: string) {
    return useQuery(
        compositeQuery<MonthlyReport>('monthly', {
            month: String(month),
            year: String(year),
            ...(stationId ? { station_id: stationId } : {}),
        })
    );
}

export function useCreditReport(filters: ReportFilters) {
    return useQuery(compositeQuery<CreditReport>('credit', clean(filters)));
}

export function useUserReport(filters: ReportFilters & { user_id?: string }) {
    return useQuery(compositeQuery<UserReport>('users', clean(filters)));
}

export function useVatReport(filters: ReportFilters) {
    return useQuery(compositeQuery<VatReport>('vat', clean(filters)));
}
