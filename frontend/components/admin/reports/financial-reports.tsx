import React, { useMemo } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useReportPl, useReportTaxSummary, useReportDebtAging } from '../../../features/api/report/report';
import type {
    ReportPl200,
    ReportTaxSummary200,
    ReportDebtAging200,
    ReportDebtAging200DataItem,
} from '../../../features/api/model';
import { ChartCard } from './chart-card';

const CHART_WIDTH = Dimensions.get('window').width - 64;

// ─── Color Palette ────────────────────────────────────────────────
const COLORS = {
    sales: '#040273',
    costs: '#f59e0b',
    taxes: '#bf0a30',
    netProfit: '#4a49a0',
    taxCollected: '#040273',
    taxPaid: '#bf0a30',
    netTax: '#4a49a0',
    bucket030: '#040273',
    bucket3160: '#f59e0b',
    bucket6190: '#f97316',
    bucket90: '#bf0a30',
};

// ─── Format helpers ───────────────────────────────────────────────
function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `KES ${(value / 1_000).toFixed(1)}K`;
    return `KES ${value.toLocaleString()}`;
}

// ─── P&L Chart ────────────────────────────────────────────────────
function PLChart() {
    const { data: plResponse, isLoading, isError } = useReportPl();

    const plData = (plResponse as unknown as ReportPl200 | undefined)?.data;

    const barData = useMemo(() => {
        if (!plData) return [];
        return [
            {
                value: plData.sales,
                label: 'Sales',
                frontColor: COLORS.sales,
                topLabelComponent: () => (
                    <Text className="text-[8px] text-ink-muted mb-0.5">{formatCurrency(plData.sales)}</Text>
                ),
            },
            {
                value: plData.costs,
                label: 'Costs',
                frontColor: COLORS.costs,
                topLabelComponent: () => (
                    <Text className="text-[8px] text-ink-muted mb-0.5">{formatCurrency(plData.costs)}</Text>
                ),
            },
            {
                value: plData.taxes,
                label: 'Taxes',
                frontColor: COLORS.taxes,
                topLabelComponent: () => (
                    <Text className="text-[8px] text-ink-muted mb-0.5">{formatCurrency(plData.taxes)}</Text>
                ),
            },
            {
                value: Math.max(plData.net_profit, 0),
                label: 'Profit',
                frontColor: COLORS.netProfit,
                topLabelComponent: () => (
                    <Text className="text-[8px] text-ink-muted mb-0.5">{formatCurrency(plData.net_profit)}</Text>
                ),
            },
        ];
    }, [plData]);

    return (
        <ChartCard
            title="Profit & Loss"
            subtitle="Revenue breakdown overview"
            isLoading={isLoading}
            isError={isError}
            isEmpty={!plData}
        >
            {/* Summary row */}
            <View className="flex-row flex-wrap gap-2 mb-4">
                <SummaryBadge label="Sales" value={formatCurrency(plData?.sales ?? 0)} color="text-brand" bgColor="bg-emerald-500/10" />
                <SummaryBadge label="Costs" value={formatCurrency(plData?.costs ?? 0)} color="text-amber-400" bgColor="bg-amber-500/10" />
                <SummaryBadge label="Net Profit" value={formatCurrency(plData?.net_profit ?? 0)} color="text-blue-400" bgColor="bg-blue-500/10" />
            </View>

            <View style={{ alignItems: 'center' }}>
                <BarChart
                    data={barData}
                    width={CHART_WIDTH - 40}
                    barWidth={40}
                    spacing={20}
                    noOfSections={4}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor="#e6e6ee"
                    xAxisLabelTextStyle={{ color: '#8b8b99', fontSize: 10 }}
                    yAxisTextStyle={{ color: '#5c5c6b', fontSize: 9 }}
                    hideRules
                    backgroundColor="transparent"
                    isAnimated
                />
            </View>
        </ChartCard>
    );
}

// ─── Tax Summary Chart ────────────────────────────────────────────
function TaxSummaryChart() {
    const { data: taxResponse, isLoading, isError } = useReportTaxSummary();

    const taxData = (taxResponse as unknown as ReportTaxSummary200 | undefined)?.data;

    const pieData = useMemo(() => {
        if (!taxData) return [];
        return [
            { value: Math.abs(taxData.tax_collected), color: COLORS.taxCollected, text: 'Collected' },
            { value: Math.abs(taxData.tax_paid), color: COLORS.taxPaid, text: 'Paid' },
        ].filter(item => item.value > 0);
    }, [taxData]);

    return (
        <ChartCard
            title="Tax Summary"
            subtitle="Collected vs paid taxes"
            isLoading={isLoading}
            isError={isError}
            isEmpty={!taxData}
        >
            {/* KPI row */}
            <View className="flex-row gap-2 mb-4">
                <SummaryBadge label="Collected" value={formatCurrency(taxData?.tax_collected ?? 0)} color="text-brand" bgColor="bg-emerald-500/10" />
                <SummaryBadge label="Paid" value={formatCurrency(taxData?.tax_paid ?? 0)} color="text-accent" bgColor="bg-accent-subtle" />
                <SummaryBadge label="Net" value={formatCurrency(taxData?.net_tax ?? 0)} color="text-blue-400" bgColor="bg-blue-500/10" />
            </View>

            {pieData.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                    <PieChart
                        data={pieData}
                        donut
                        innerRadius={50}
                        radius={70}
                        innerCircleColor="#f7f7fa"
                        centerLabelComponent={() => (
                            <View style={{ alignItems: 'center' }}>
                                <Text className="text-ink-muted text-[9px]">Net Tax</Text>
                                <Text className="text-ink text-xs font-bold">{formatCurrency(taxData?.net_tax ?? 0)}</Text>
                            </View>
                        )}
                    />
                    {/* Legend */}
                    <View className="flex-row gap-4 mt-3">
                        <LegendDot color={COLORS.taxCollected} label="Collected" />
                        <LegendDot color={COLORS.taxPaid} label="Paid" />
                    </View>
                </View>
            ) : null}
        </ChartCard>
    );
}

// ─── Debt Aging Chart ─────────────────────────────────────────────
function DebtAgingChart() {
    const { data: debtResponse, isLoading, isError } = useReportDebtAging();

    const debtData = (debtResponse as unknown as ReportDebtAging200 | undefined)?.data;

    const stackData = useMemo(() => {
        if (!debtData || debtData.length === 0) return [];
        // Take top 6 debtors by total_debt
        const sorted = [...debtData].sort((a, b) => b.total_debt - a.total_debt).slice(0, 6);
        return sorted.map((item: ReportDebtAging200DataItem) => ({
            stacks: [
                { value: Number(item.buckets['0-30']) || 0, color: COLORS.bucket030 },
                { value: Number(item.buckets['31-60']) || 0, color: COLORS.bucket3160, marginBottom: 1 },
                { value: Number(item.buckets['61-90']) || 0, color: COLORS.bucket6190, marginBottom: 1 },
                { value: Number(item.buckets['90+']) || 0, color: COLORS.bucket90, marginBottom: 1 },
            ],
            label: item.customer_name.length > 8
                ? item.customer_name.slice(0, 7) + '…'
                : item.customer_name,
        }));
    }, [debtData]);

    return (
        <ChartCard
            title="Debt Aging"
            subtitle="Outstanding balances by age bucket"
            isLoading={isLoading}
            isError={isError}
            isEmpty={!debtData || debtData.length === 0}
            emptyMessage="No outstanding debts"
        >
            {/* Legend */}
            <View className="flex-row flex-wrap gap-3 mb-4">
                <LegendDot color={COLORS.bucket030} label="0-30 days" />
                <LegendDot color={COLORS.bucket3160} label="31-60 days" />
                <LegendDot color={COLORS.bucket6190} label="61-90 days" />
                <LegendDot color={COLORS.bucket90} label="90+ days" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                    stackData={stackData}
                    width={Math.max(CHART_WIDTH - 40, stackData.length * 60)}
                    barWidth={32}
                    spacing={16}
                    noOfSections={4}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor="#e6e6ee"
                    xAxisLabelTextStyle={{ color: '#8b8b99', fontSize: 9 }}
                    yAxisTextStyle={{ color: '#5c5c6b', fontSize: 9 }}
                    formatYLabel={(val: string) => {
                        const num = parseFloat(val);
                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                        return val;
                    }}
                    yAxisLabelSuffix=""
                    hideRules
                    backgroundColor="transparent"
                    isAnimated
                />
            </ScrollView>
        </ChartCard>
    );
}

// ─── Helper Components ────────────────────────────────────────────
function SummaryBadge({ label, value, color, bgColor }: {
    label: string;
    value: string;
    color: string;
    bgColor: string;
}) {
    return (
        <View className={`flex-1 ${bgColor} rounded-lg px-3 py-2`}>
            <Text className="text-ink-muted text-[9px] uppercase tracking-wider font-bold">{label}</Text>
            <Text className={`${color} text-xs font-bold font-mono mt-0.5`}>{value}</Text>
        </View>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <View className="flex-row items-center gap-1.5">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text className="text-ink-muted text-[10px]">{label}</Text>
        </View>
    );
}

// ─── Main Export ──────────────────────────────────────────────────
export function FinancialReports() {
    return (
        <View>
            {/* Section header */}
            <View className="mb-3 mt-2">
                <Text className="text-ink font-bold text-lg">Financial Reports</Text>
                <Text className="text-ink-muted text-xs">Revenue, taxes & receivables</Text>
            </View>

            <PLChart />
            <TaxSummaryChart />
            <DebtAgingChart />
        </View>
    );
}
