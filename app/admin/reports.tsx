import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Download } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { ReportFilterBar } from '../../components/admin/reports/report-filter-bar';
import {
    DataTable,
    KeyValues,
    SectionLabel,
    TileRow,
    litres,
    money,
} from '../../components/admin/reports/report-primitives';
import {
    formatPeriod,
    resolvePeriod,
    useCreditReport,
    useEndOfDay,
    useMonthlyReport,
    useUserReport,
    useVatReport,
    type ReportFilters,
} from '@/features/reports';
import { downloadReportPdf, type ReportSlug } from '@/lib/report-download';
import { getApiErrorMessage } from '@/lib/api-error';

const REPORTS: { slug: ReportSlug; label: string; chip: string; blurb: string }[] = [
    { slug: 'end-of-day', label: 'End of day', chip: 'Day', blurb: 'All shifts on one day, combined' },
    { slug: 'monthly', label: 'Monthly', chip: 'Month', blurb: 'A month rolled up, day by day' },
    { slug: 'credit', label: 'Credit', chip: 'Credit', blurb: 'What customers owe, and their limits' },
    { slug: 'users', label: 'Attendants', chip: 'Staff', blurb: 'Per-person variance, worst first' },
    { slug: 'vat', label: 'VAT', chip: 'VAT', blurb: 'Output against input tax' },
];

export default function AdminReports() {
    const [active, setActive] = useState<ReportSlug>('end-of-day');
    const [filters, setFilters] = useState<ReportFilters>(() => resolvePeriod('this_month'));
    const [downloading, setDownloading] = useState(false);

    // End of day is a single date, so it uses the range's end rather than both.
    const day = filters.end_date ?? new Date().toISOString().slice(0, 10);
    const month = useMemo(() => {
        const from = new Date(`${filters.start_date ?? day}T00:00:00`);
        return { month: from.getMonth() + 1, year: from.getFullYear() };
    }, [filters.start_date, day]);

    const endOfDay = useEndOfDay(day, filters.station_id);
    const monthly = useMonthlyReport(month.month, month.year, filters.station_id);
    const credit = useCreditReport(filters);
    const users = useUserReport(filters);
    const vat = useVatReport(filters);

    const current = { 'end-of-day': endOfDay, monthly, credit, users, vat }[active];

    const download = useCallback(async () => {
        setDownloading(true);
        try {
            const params: Record<string, string | undefined> =
                active === 'end-of-day'
                    ? { date: day, station_id: filters.station_id }
                    : active === 'monthly'
                      ? {
                            month: String(month.month),
                            year: String(month.year),
                            station_id: filters.station_id,
                        }
                      : {
                            start_date: filters.start_date,
                            end_date: filters.end_date,
                            station_id: filters.station_id,
                        };

            const label = REPORTS.find((report) => report.slug === active)?.label ?? active;
            await downloadReportPdf(active, params, `${label} ${day}`);
        } catch (error) {
            toast.error('Could not create the PDF', { description: getApiErrorMessage(error) });
        } finally {
            setDownloading(false);
        }
    }, [active, day, filters, month]);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['left', 'right']}>
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 48 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={current.isFetching}
                            onRefresh={() => current.refetch()}
                            tintColor="#040273"
                        />
                    }
                >
                    <View className="gap-1 pb-4 pt-4">
                        <Text className="text-ink-faint text-xs font-bold uppercase tracking-wider">
                            Reports
                        </Text>
                        <Text className="text-ink text-2xl font-bold">
                            {REPORTS.find((report) => report.slug === active)?.label}
                        </Text>
                        <Text className="text-ink-muted text-xs">
                            {REPORTS.find((report) => report.slug === active)?.blurb}
                            {' · '}
                            {active === 'end-of-day' ? day : formatPeriod(filters)}
                        </Text>
                    </View>

                    {/* Report picker */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                        <View className="flex-row gap-2">
                            {REPORTS.map((report) => {
                                const selected = report.slug === active;
                                return (
                                    <Pressable
                                        key={report.slug}
                                        onPress={() => setActive(report.slug)}
                                        accessibilityRole="button"
                                        className={`rounded-full border px-3 py-1.5 ${
                                            selected
                                                ? 'border-brand bg-brand'
                                                : 'border-surface-border bg-surface active:bg-surface-sunken'
                                        }`}
                                    >
                                        <Text
                                            className={`text-[11px] font-semibold ${
                                                selected ? 'text-white' : 'text-ink-muted'
                                            }`}
                                        >
                                            {report.chip}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <ReportFilterBar filters={filters} onChange={setFilters} />

                    <Pressable
                        onPress={download}
                        disabled={downloading || current.isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Download this report as a PDF"
                        className={`mb-4 flex-row items-center justify-center gap-2 self-start rounded-full bg-brand px-4 py-2 ${
                            downloading || current.isLoading ? 'opacity-60' : 'active:opacity-80'
                        }`}
                    >
                        {downloading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Download size={15} color="#ffffff" />
                        )}
                        <Text className="text-white text-[11px] font-semibold">
                            {downloading ? 'Preparing PDF...' : 'Download PDF'}
                        </Text>
                    </Pressable>

                    {current.isLoading ? (
                        <View className="items-center py-16">
                            <ActivityIndicator color="#040273" />
                        </View>
                    ) : current.isError ? (
                        <View className="items-center rounded-xl bg-accent-subtle px-4 py-10">
                            <Text className="text-accent text-sm font-bold">Could not load report</Text>
                            <Text className="text-ink-muted mt-1 text-center text-xs">
                                Pull down to try again.
                            </Text>
                        </View>
                    ) : (
                        <>
                            {active === 'end-of-day' && endOfDay.data ? (
                                <EndOfDayBody report={endOfDay.data.data} />
                            ) : null}
                            {active === 'monthly' && monthly.data ? (
                                <MonthlyBody report={monthly.data.data} />
                            ) : null}
                            {active === 'credit' && credit.data ? (
                                <CreditBody report={credit.data.data} />
                            ) : null}
                            {active === 'users' && users.data ? (
                                <UsersBody report={users.data.data} />
                            ) : null}
                            {active === 'vat' && vat.data ? <VatBody report={vat.data.data} /> : null}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Report bodies ────────────────────────────────────────────────

function EndOfDayBody({ report }: { report: NonNullable<ReturnType<typeof useEndOfDay>['data']>['data'] }) {
    return (
        <View>
            <TileRow
                tiles={[
                    { label: 'Shifts', value: String(report.totals.shift_count) },
                    { label: 'Litres sold', value: litres(report.totals.liters_sold) },
                    { label: 'Expected', value: money(report.totals.expected_cash) },
                    {
                        label: 'Variance',
                        value: money(report.totals.cash_variance),
                        tone: 'signed',
                        amount: report.totals.cash_variance,
                    },
                ]}
            />

            <SectionLabel>Money collected</SectionLabel>
            <KeyValues
                rows={[
                    { label: 'Cash', value: money(report.payments.cash) },
                    { label: 'M-Pesa', value: money(report.payments.mpesa) },
                    { label: 'Credit', value: money(report.payments.credit) },
                    { label: 'Total collected', value: money(report.totals.collected_cash), total: true },
                ]}
            />

            <SectionLabel>Shifts</SectionLabel>
            <DataTable
                emptyMessage="No shifts on this day"
                columns={[
                    { key: 'shift', label: 'Shift', width: 118 },
                    { key: 'attendant', label: 'Attendant', width: 104 },
                    { key: 'time', label: 'Open / close', width: 96 },
                    { key: 'litres', label: 'Litres', width: 100, align: 'right' },
                    { key: 'expected', label: 'Expected', width: 124, align: 'right' },
                    { key: 'collected', label: 'Collected', width: 124, align: 'right' },
                    { key: 'variance', label: 'Variance', width: 124, align: 'right' },
                ]}
                rows={report.shifts.map((shift) => ({
                    shift: { text: shift.shift_number ?? '-' },
                    attendant: { text: shift.attendant ?? '-' },
                    time: { text: `${shift.started_at ?? '-'} / ${shift.locked_at ?? 'open'}`, muted: true },
                    litres: { text: litres(shift.liters_sold) },
                    expected: { text: money(shift.expected_cash) },
                    collected: { text: money(shift.collected_cash) },
                    variance: { text: money(shift.cash_variance), negative: shift.cash_variance < 0 },
                }))}
            />

            <SectionLabel>Wet stock &amp; tax</SectionLabel>
            <KeyValues
                rows={[
                    {
                        label: 'Stock variance (litres)',
                        value: litres(report.totals.stock_variance_liters),
                        signed: report.totals.stock_variance_liters,
                    },
                    { label: 'VAT collected', value: money(report.totals.tax_collected) },
                ]}
            />

            {report.credit_sales.length > 0 ? (
                <>
                    <SectionLabel>Credit sales</SectionLabel>
                    <DataTable
                        columns={[
                            { key: 'customer', label: 'Customer', width: 150 },
                            { key: 'vehicle', label: 'Vehicle', width: 104 },
                            { key: 'amount', label: 'Amount', width: 124, align: 'right' },
                        ]}
                        rows={report.credit_sales.map((sale) => ({
                            customer: { text: sale.customer_name ?? '-' },
                            vehicle: { text: sale.vehicle_reg ?? '-', muted: true },
                            amount: { text: money(sale.amount) },
                        }))}
                    />
                </>
            ) : null}
        </View>
    );
}

function MonthlyBody({ report }: { report: NonNullable<ReturnType<typeof useMonthlyReport>['data']>['data'] }) {
    return (
        <View>
            <TileRow
                tiles={[
                    { label: 'Litres sold', value: litres(report.totals.liters_sold) },
                    { label: 'Sales value', value: money(report.totals.expected_cash) },
                    { label: 'Purchases', value: money(report.purchases.total_cost) },
                    {
                        label: 'Gross margin',
                        value: money(report.gross_margin),
                        tone: 'signed',
                        amount: report.gross_margin,
                    },
                ]}
            />

            <SectionLabel>{report.month} at a glance</SectionLabel>
            <KeyValues
                rows={[
                    { label: 'Shifts worked', value: String(report.totals.shift_count) },
                    { label: 'Days traded', value: String(report.days_traded) },
                    { label: 'Cash collected', value: money(report.totals.collected_cash) },
                    {
                        label: 'Cash variance',
                        value: money(report.totals.cash_variance),
                        signed: report.totals.cash_variance,
                    },
                    {
                        label: 'Stock variance (litres)',
                        value: litres(report.totals.stock_variance_liters),
                        signed: report.totals.stock_variance_liters,
                    },
                ]}
            />

            <SectionLabel>Fuel purchased</SectionLabel>
            <KeyValues
                rows={[
                    { label: 'Deliveries', value: String(report.purchases.lifting_count) },
                    { label: 'Litres received', value: litres(report.purchases.liters_received) },
                    { label: 'Total cost', value: money(report.purchases.total_cost) },
                    { label: 'VAT paid', value: money(report.purchases.tax_paid) },
                ]}
            />

            <SectionLabel>VAT position</SectionLabel>
            <KeyValues
                rows={[
                    { label: 'Collected on sales', value: money(report.totals.tax_collected) },
                    { label: 'Paid on purchases', value: money(report.purchases.tax_paid) },
                    {
                        label: report.net_vat >= 0 ? 'Net payable' : 'Net reclaimable',
                        value: money(Math.abs(report.net_vat)),
                        total: true,
                    },
                ]}
            />

            <SectionLabel>Daily breakdown</SectionLabel>
            <DataTable
                emptyMessage="No trading this month"
                columns={[
                    { key: 'date', label: 'Date', width: 96 },
                    { key: 'shifts', label: 'Shifts', width: 62, align: 'right' },
                    { key: 'litres', label: 'Litres', width: 100, align: 'right' },
                    { key: 'expected', label: 'Expected', width: 124, align: 'right' },
                    { key: 'collected', label: 'Collected', width: 124, align: 'right' },
                    { key: 'variance', label: 'Variance', width: 124, align: 'right' },
                ]}
                rows={report.daily.map((day) => ({
                    date: { text: day.date },
                    shifts: { text: String(day.shift_count) },
                    litres: { text: litres(day.liters_sold) },
                    expected: { text: money(day.expected_cash) },
                    collected: { text: money(day.collected_cash) },
                    variance: { text: money(day.cash_variance), negative: day.cash_variance < 0 },
                }))}
            />
        </View>
    );
}

function CreditBody({ report }: { report: NonNullable<ReturnType<typeof useCreditReport>['data']>['data'] }) {
    return (
        <View>
            <TileRow
                tiles={[
                    { label: 'Customers', value: String(report.totals.customer_count) },
                    { label: 'Charged', value: money(report.totals.period_charges) },
                    {
                        label: 'Outstanding',
                        value: money(report.totals.outstanding),
                        tone: 'signed',
                        amount: -report.totals.outstanding,
                    },
                    {
                        label: 'Over limit',
                        value: String(report.totals.over_limit_count),
                        tone: 'signed',
                        amount: report.totals.over_limit_count > 0 ? -1 : 0,
                    },
                ]}
            />

            <SectionLabel>Credit customers</SectionLabel>
            <DataTable
                emptyMessage="No credit activity or balances"
                columns={[
                    { key: 'customer', label: 'Customer', width: 140 },
                    { key: 'opening', label: 'Opening', width: 124, align: 'right' },
                    { key: 'charges', label: 'Charges', width: 124, align: 'right' },
                    { key: 'balance', label: 'Balance', width: 124, align: 'right' },
                    { key: 'limit', label: 'Limit', width: 100, align: 'right' },
                    { key: 'used', label: 'Used', width: 78, align: 'right' },
                ]}
                rows={report.customers.map((customer) => ({
                    customer: { text: customer.customer_name },
                    opening: { text: money(customer.opening_balance) },
                    charges: { text: money(customer.period_charges) },
                    balance: { text: money(customer.current_balance) },
                    limit: {
                        text: customer.credit_limit > 0 ? money(customer.credit_limit) : 'none',
                        muted: customer.credit_limit === 0,
                    },
                    used: {
                        text: customer.utilisation_pct === null ? '-' : `${customer.utilisation_pct}%`,
                        negative: customer.over_limit,
                    },
                }))}
            />
        </View>
    );
}

function UsersBody({ report }: { report: NonNullable<ReturnType<typeof useUserReport>['data']>['data'] }) {
    return (
        <View>
            <TileRow
                tiles={[
                    { label: 'Attendants', value: String(report.totals.user_count) },
                    { label: 'Shifts worked', value: String(report.totals.shift_count) },
                    {
                        label: 'Total variance',
                        value: money(report.totals.cash_variance),
                        tone: 'signed',
                        amount: report.totals.cash_variance,
                    },
                ]}
            />

            <Text className="text-ink-muted mb-2 mt-2 text-xs">
                Worst variance first. A repeated shortfall against one attendant is the pattern
                worth acting on; a single bad shift is not.
            </Text>

            <DataTable
                emptyMessage="No shifts in this period"
                columns={[
                    { key: 'name', label: 'Attendant', width: 128 },
                    { key: 'shifts', label: 'Shifts', width: 62, align: 'right' },
                    { key: 'litres', label: 'Litres', width: 100, align: 'right' },
                    { key: 'expected', label: 'Expected', width: 124, align: 'right' },
                    { key: 'collected', label: 'Collected', width: 124, align: 'right' },
                    { key: 'variance', label: 'Variance', width: 124, align: 'right' },
                    { key: 'avg', label: 'Avg / shift', width: 124, align: 'right' },
                ]}
                rows={report.users.map((user) => ({
                    name: { text: user.user_name },
                    shifts: { text: String(user.shift_count) },
                    litres: { text: litres(user.liters_sold) },
                    expected: { text: money(user.expected_cash) },
                    collected: { text: money(user.collected_cash) },
                    variance: { text: money(user.cash_variance), negative: user.cash_variance < 0 },
                    avg: {
                        text: money(user.avg_variance_per_shift),
                        negative: user.avg_variance_per_shift < 0,
                    },
                }))}
            />
        </View>
    );
}

function VatBody({ report }: { report: NonNullable<ReturnType<typeof useVatReport>['data']>['data'] }) {
    return (
        <View>
            <TileRow
                tiles={[
                    { label: 'Output VAT', value: money(report.totals.tax_collected) },
                    { label: 'Input VAT', value: money(report.totals.tax_paid) },
                    {
                        label: report.totals.payable ? 'Net payable' : 'Net reclaimable',
                        value: money(Math.abs(report.totals.net_tax)),
                        tone: 'signed',
                        amount: report.totals.payable ? -1 : 1,
                    },
                ]}
            />

            <SectionLabel>VAT position</SectionLabel>
            <KeyValues
                rows={[
                    { label: 'Taxable sales', value: money(report.totals.taxable_sales) },
                    { label: 'Output VAT on sales', value: money(report.totals.tax_collected) },
                    { label: 'Taxable purchases', value: money(report.totals.taxable_purchases) },
                    { label: 'Input VAT on purchases', value: money(report.totals.tax_paid) },
                    {
                        label: report.totals.payable ? 'Net VAT payable' : 'Net VAT reclaimable',
                        value: money(Math.abs(report.totals.net_tax)),
                        total: true,
                    },
                ]}
            />

            <SectionLabel>Month by month</SectionLabel>
            <DataTable
                emptyMessage="No VAT activity in this period"
                columns={[
                    { key: 'period', label: 'Period', width: 100 },
                    { key: 'output', label: 'Output VAT', width: 124, align: 'right' },
                    { key: 'input', label: 'Input VAT', width: 124, align: 'right' },
                    { key: 'net', label: 'Net', width: 124, align: 'right' },
                ]}
                rows={report.periods.map((period) => ({
                    period: { text: period.label },
                    output: { text: money(period.tax_collected) },
                    input: { text: money(period.tax_paid) },
                    net: { text: money(period.net_tax) },
                }))}
            />

            <Text className="text-ink-faint mt-3 text-[11px] leading-4">
                VAT is charged inside the pump price, so output tax is derived as
                total − (total ÷ 1 + rate), not added on top. This is a working summary,
                not a filed return.
            </Text>
        </View>
    );
}
