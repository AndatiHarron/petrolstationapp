import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useVarianceTrend, formatPeriod, type ReportFilters } from '@/features/reports';
import { ChartCard } from './chart-card';

const CHART_WIDTH = Dimensions.get('window').width - 104;

/** Plot box geometry. Section height and point spacing are kept equal so the
 *  gridlines form squares — graph-paper ruling rather than wide flat bands. */
const CELL = 34;
const MAX_SECTIONS = 4;

// ─── Types ────────────────────────────────────────────────────────
interface VarianceDataPoint {
    date: string;
    total_variance: string;
}

// ─── Colors ───────────────────────────────────────────────────────
// Variance is signed, so this is a diverging encoding: one hue each side of a
// neutral zero line. Grid and axes stay recessive so the data reads first.
const COLORS = {
    line: '#4a49a0',
    positive: '#040273',
    negative: '#bf0a30',
    grid: '#e6e6ee',
    zero: '#c9c9d8',
    axisText: '#5c5c6b',
    labelText: '#8b8b99',
};

// ─── Format helpers ───────────────────────────────────────────────
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `KES ${(value / 1_000).toFixed(1)}K`;
    return `KES ${value.toFixed(0)}`;
}

function formatAxis(value: number): string {
    if (value === 0) return '0';
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(Math.round(value));
}

/** Round a span up to a readable 1 / 2 / 5 × 10ⁿ step. The step used to be
 *  hardcoded at 5000, which forced the library to add sections until the real
 *  values fitted — that is what made the plot grow tall enough to scroll. */
function niceStep(span: number, sections: number): number {
    if (span <= 0 || !Number.isFinite(span)) return 1;
    const rough = span / sections;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalised = rough / magnitude;
    const snapped = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
    return snapped * magnitude;
}

// ─── Variance Trend Chart ─────────────────────────────────────────
function VarianceTrendChart({ filters }: { filters: ReportFilters }) {
    const { data: varianceResponse, isLoading, isError } = useVarianceTrend(filters);

    const dataPoints = (varianceResponse as unknown as { data: VarianceDataPoint[] } | undefined)?.data;

    const { lineData, summaryStats, axis } = useMemo(() => {
        if (!dataPoints || dataPoints.length === 0) {
            return { lineData: [], summaryStats: null, axis: null };
        }

        const sorted = [...dataPoints].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const line = sorted.map((point) => {
            const value = parseFloat(point.total_variance);
            return {
                value,
                label: formatDate(point.date),
                dataPointColor: value >= 0 ? COLORS.positive : COLORS.negative,
            };
        });

        const values = line.map((p) => p.value);
        const total = values.reduce((sum, v) => sum + v, 0);
        const highest = Math.max(0, ...values);
        const lowest = Math.min(0, ...values);

        // Split the available sections between the two sides of zero in
        // proportion to how far the data actually reaches each way. Each side
        // keeps a floor of one section: an all-negative series (the common case
        // here) would otherwise ask for zero sections above the axis, leaving the
        // plot with no height to draw into.
        const span = highest - lowest || 1;
        const step = niceStep(span, MAX_SECTIONS);
        const above = highest > 0 ? Math.ceil(highest / step) : 1;
        const below = lowest < 0 ? Math.ceil(Math.abs(lowest) / step) : 0;

        return {
            lineData: line,
            summaryStats: {
                totalVariance: total,
                avgVariance: total / values.length,
                minVariance: Math.min(...values),
                maxVariance: Math.max(...values),
                dataPointCount: values.length,
            },
            axis: {
                stepValue: step,
                sectionsAbove: above,
                sectionsBelow: below,
                maxValue: step * above,
                mostNegativeValue: -step * below,
            },
        };
    }, [dataPoints]);

    return (
        <ChartCard
            title="Variance Trend"
            subtitle="Total variance per day (KES)"
            isLoading={isLoading}
            isError={isError}
            isEmpty={!dataPoints || dataPoints.length === 0}
            emptyMessage="No variance data available"
        >
            {/* Summary figures. Ink tokens carry the text; the sign carries meaning. */}
            {summaryStats ? (
                <View className="flex-row gap-2 mb-3">
                    <View className="flex-1 bg-surface-sunken rounded-lg px-3 py-2">
                        <Text className="text-ink-faint text-[9px] uppercase tracking-wider font-bold">Avg / day</Text>
                        <Text className={`text-xs font-bold font-mono mt-0.5 ${summaryStats.avgVariance >= 0 ? 'text-brand' : 'text-accent'}`}>
                            {formatCurrency(summaryStats.avgVariance)}
                        </Text>
                    </View>
                    <View className="flex-1 bg-surface-sunken rounded-lg px-3 py-2">
                        <Text className="text-ink-faint text-[9px] uppercase tracking-wider font-bold">Total</Text>
                        <Text className={`text-xs font-bold font-mono mt-0.5 ${summaryStats.totalVariance >= 0 ? 'text-brand' : 'text-accent'}`}>
                            {formatCurrency(summaryStats.totalVariance)}
                        </Text>
                    </View>
                    <View className="flex-1 bg-surface-sunken rounded-lg px-3 py-2">
                        <Text className="text-ink-faint text-[9px] uppercase tracking-wider font-bold">Worst day</Text>
                        <Text className={`text-xs font-bold font-mono mt-0.5 ${summaryStats.minVariance >= 0 ? 'text-brand' : 'text-accent'}`}>
                            {formatCurrency(summaryStats.minVariance)}
                        </Text>
                    </View>
                </View>
            ) : null}

            {/*
              No legend: there is a single series and the card title names it.
              The old legend row, the per-point value labels and an oversized plot
              were together making this section long enough to need scrolling.
              Long histories now scroll sideways within the chart instead.
            */}
            {axis ? (
                <LineChart
                    data={lineData}
                    width={CHART_WIDTH}
                    height={CELL * (axis.sectionsAbove + axis.sectionsBelow)}
                    spacing={CELL + 4}
                    initialSpacing={16}
                    endSpacing={16}

                    color={COLORS.line}
                    thickness={2}
                    dataPointsRadius={4}
                    curved={false}

                    /* graph-paper ruling: horizontal rules + vertical lines = boxes */
                    rulesColor={COLORS.grid}
                    rulesThickness={1}
                    showVerticalLines
                    verticalLinesColor={COLORS.grid}
                    verticalLinesThickness={1}

                    /* zero is the reference this whole chart is read against */
                    showReferenceLine1
                    referenceLine1Position={0}
                    referenceLine1Config={{
                        color: COLORS.zero,
                        thickness: 1.5,
                        dashWidth: 0,
                        dashGap: 0,
                    }}

                    stepValue={axis.stepValue}
                    noOfSections={axis.sectionsAbove}
                    noOfSectionsBelowXAxis={axis.sectionsBelow}
                    maxValue={axis.maxValue}
                    mostNegativeValue={axis.mostNegativeValue}
                    formatYLabel={(label: string) => formatAxis(Number(label))}

                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor={COLORS.grid}
                    yAxisTextStyle={{ color: COLORS.axisText, fontSize: 9 }}
                    xAxisLabelTextStyle={{ color: COLORS.labelText, fontSize: 8 }}
                    yAxisLabelWidth={34}
                    backgroundColor="transparent"

                    scrollToEnd
                    disableScroll={false}

                    /* Touch a point to read its value, instead of printing a
                       number above every one of them. */
                    pointerConfig={{
                        pointerStripHeight: CELL * (axis.sectionsAbove + axis.sectionsBelow),
                        pointerStripColor: COLORS.zero,
                        pointerStripWidth: 1,
                        pointerColor: COLORS.line,
                        radius: 5,
                        activatePointersOnLongPress: false,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelWidth: 108,
                        pointerLabelHeight: 44,
                        pointerLabelComponent: (items: { value: number; label: string }[]) => {
                            const item = items?.[0];
                            if (!item) return null;
                            return (
                                <View className="bg-surface border border-surface-border rounded-lg px-2.5 py-1.5">
                                    <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                                        {item.label}
                                    </Text>
                                    <Text
                                        className={`text-xs font-mono font-bold mt-0.5 ${item.value >= 0 ? 'text-brand' : 'text-accent'}`}
                                    >
                                        {formatCurrency(item.value)}
                                    </Text>
                                </View>
                            );
                        },
                    }}
                />
            ) : null}
        </ChartCard>
    );
}

// ─── Main Export ──────────────────────────────────────────────────
export function InventoryReports({ filters }: { filters: ReportFilters }) {
    return (
        <View className="gap-3">
            {/* Section header */}
            <View className="mb-2 mt-1">
                <Text className="text-ink text-[15px] font-bold">Inventory</Text>
                <Text className="text-ink-faint text-[11px]">Stock &amp; cash variance &middot; {formatPeriod(filters)}</Text>
            </View>

            <VarianceTrendChart filters={filters} />
        </View>
    );
}
