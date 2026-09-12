import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useVarianceTrend, formatPeriod, type ReportFilters } from '@/features/reports';
import { ChartCard } from './chart-card';

const CHART_WIDTH = Dimensions.get('window').width - 108;

/**
 * Plot geometry. Four sections of 26px is a 104px plot — tall enough to read a
 * shape, short enough that the section does not dominate the page. The old
 * square-celled grid grew with the data and pushed the card past a screen.
 */
const SECTION_HEIGHT = 26;
const MAX_SECTIONS = 4;
const BAR_WIDTH = 14;
const BAR_GAP = 12;

interface VarianceDataPoint {
    date: string;
    total_variance: string | number;
}

// Diverging: one hue each side of a neutral zero line, because the sign is the
// whole message. Grid and axis stay recessive.
const COLORS = {
    positive: '#040273',
    negative: '#bf0a30',
    grid: '#eeeef4',
    zero: '#c9c9d8',
    axisText: '#8b8b99',
};

function shortDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function money(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${value < 0 ? '-' : ''}${(abs / 1_000).toFixed(1)}K`;
    return String(Math.round(value));
}

/** Round a span up to a readable 1 / 2 / 5 × 10ⁿ step. */
function niceStep(span: number, sections: number): number {
    if (span <= 0 || !Number.isFinite(span)) return 1;
    const rough = span / sections;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const n = rough / magnitude;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * magnitude;
}

// ─── Variance trend ───────────────────────────────────────────────
function VarianceTrendChart({ filters }: { filters: ReportFilters }) {
    const { data: varianceResponse, isLoading, isError } = useVarianceTrend(filters);

    const points = (varianceResponse as unknown as { data: VarianceDataPoint[] } | undefined)?.data;

    const { bars, stats, axis } = useMemo(() => {
        if (!points || points.length === 0) {
            return { bars: [], stats: null, axis: null };
        }

        const sorted = [...points].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const values = sorted.map((point) => Number(point.total_variance) || 0);

        // A day is a discrete bucket, not a point on a continuous line, so bars
        // rather than a line: the sign reads instantly and short ranges do not
        // pretend to be a trend.
        const barData = sorted.map((point, i) => {
            const value = values[i];
            return {
                value,
                label: shortDate(point.date),
                frontColor: value < 0 ? COLORS.negative : COLORS.positive,
                labelTextStyle: { color: COLORS.axisText, fontSize: 8 },
            };
        });

        const total = values.reduce((sum, v) => sum + v, 0);
        const worst = Math.min(...values);
        const highest = Math.max(0, ...values);
        const lowest = Math.min(0, ...values);

        const step = niceStep(highest - lowest || 1, MAX_SECTIONS);
        const above = highest > 0 ? Math.ceil(highest / step) : 1;
        const below = lowest < 0 ? Math.ceil(Math.abs(lowest) / step) : 0;

        return {
            bars: barData,
            stats: {
                total,
                worst,
                days: values.length,
                badDays: values.filter((v) => v < 0).length,
            },
            axis: {
                stepValue: step,
                sectionsAbove: above,
                sectionsBelow: below,
                maxValue: step * above,
                mostNegativeValue: -step * below,
                height: SECTION_HEIGHT * (above + below),
            },
        };
    }, [points]);

    return (
        <ChartCard
            title="Variance trend"
            subtitle={`Daily cash variance · ${formatPeriod(filters)}`}
            isLoading={isLoading}
            isError={isError}
            isEmpty={!points || points.length === 0}
            emptyMessage="No shifts closed in this period"
        >
            {stats ? (
                <>
                    {/* Three figures, one line. The old three-tile row took as
                        much height as the plot it introduced. */}
                    <View className="mb-3 flex-row items-baseline justify-between gap-2">
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                                Total
                            </Text>
                            <Text
                                className={`font-mono text-sm font-bold ${
                                    stats.total < 0 ? 'text-accent' : 'text-brand'
                                }`}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {money(stats.total)}
                            </Text>
                        </View>

                        <View className="min-w-0 flex-1">
                            <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                                Worst day
                            </Text>
                            <Text
                                className={`font-mono text-sm font-bold ${
                                    stats.worst < 0 ? 'text-accent' : 'text-brand'
                                }`}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {money(stats.worst)}
                            </Text>
                        </View>

                        <View className="min-w-0 flex-1">
                            <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                                Short days
                            </Text>
                            <Text className="text-ink font-mono text-sm font-bold">
                                {stats.badDays}
                                <Text className="text-ink-faint text-[11px]"> / {stats.days}</Text>
                            </Text>
                        </View>
                    </View>

                    {axis ? (
                        <BarChart
                            data={bars}
                            width={CHART_WIDTH}
                            height={axis.height}
                            barWidth={BAR_WIDTH}
                            spacing={BAR_GAP}
                            initialSpacing={10}
                            endSpacing={10}
                            barBorderRadius={0}
                            /* One faint rule per section, no vertical ruling:
                               bars already mark the horizontal positions. */
                            rulesColor={COLORS.grid}
                            rulesThickness={1}
                            /* Zero is the line the whole chart is read against. */
                            showReferenceLine1
                            referenceLine1Position={0}
                            referenceLine1Config={{ color: COLORS.zero, thickness: 1 }}
                            stepValue={axis.stepValue}
                            noOfSections={axis.sectionsAbove}
                            noOfSectionsBelowXAxis={axis.sectionsBelow}
                            maxValue={axis.maxValue}
                            mostNegativeValue={axis.mostNegativeValue}
                            formatYLabel={(label: string) => money(Number(label))}
                            yAxisThickness={0}
                            xAxisThickness={1}
                            xAxisColor={COLORS.grid}
                            yAxisTextStyle={{ color: COLORS.axisText, fontSize: 8 }}
                            yAxisLabelWidth={30}
                            xAxisLabelTextStyle={{ color: COLORS.axisText, fontSize: 8 }}
                            backgroundColor="transparent"
                            isAnimated
                            animationDuration={400}
                            scrollAnimation={false}
                        />
                    ) : null}

                    <View className="mt-2 flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1.5">
                            <View
                                style={{ width: 8, height: 8, backgroundColor: COLORS.negative }}
                            />
                            <Text className="text-ink-faint text-[10px]">Short</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <View
                                style={{ width: 8, height: 8, backgroundColor: COLORS.positive }}
                            />
                            <Text className="text-ink-faint text-[10px]">Over</Text>
                        </View>
                    </View>
                </>
            ) : null}
        </ChartCard>
    );
}

// ─── Main export ──────────────────────────────────────────────────
export function InventoryReports({ filters }: { filters: ReportFilters }) {
    return (
        <View className="gap-3">
            <View className="mb-2 mt-1">
                <Text className="text-ink text-[15px] font-bold">Inventory</Text>
                <Text className="text-ink-faint text-[11px]">
                    Stock &amp; cash variance
                </Text>
            </View>

            <VarianceTrendChart filters={filters} />
        </View>
    );
}
