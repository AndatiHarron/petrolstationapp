import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useReportVarianceTrend } from '../../../features/api/report/report';
import { ChartCard } from './chart-card';

const CHART_WIDTH = Dimensions.get('window').width - 64;

// ─── Types ────────────────────────────────────────────────────────
interface VarianceDataPoint {
    date: string;
    total_variance: string;
}

// ─── Colors ───────────────────────────────────────────────────────
const COLORS = {
    variance: '#3b82f6',
    positive: '#10b981',
    negative: '#ef4444',
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

// ─── Variance Trend Chart ─────────────────────────────────────────
function VarianceTrendChart() {
    const { data: varianceResponse, isLoading, isError } = useReportVarianceTrend();

    const dataPoints = (varianceResponse as unknown as { data: VarianceDataPoint[] } | undefined)?.data;

    const { lineData, summaryStats } = useMemo(() => {
        if (!dataPoints || dataPoints.length === 0) {
            return { lineData: [], summaryStats: null };
        }

        // Sort by date
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

        // Calculate summary stats
        const values = sorted.map((p) => parseFloat(p.total_variance));
        const total = values.reduce((sum, v) => sum + v, 0);
        const avg = total / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            lineData: line,
            summaryStats: {
                totalVariance: total,
                avgVariance: avg,
                minVariance: min,
                maxVariance: max,
                dataPointCount: values.length,
            },
        };
    }, [dataPoints]);

    return (
        <ChartCard
            title="Variance Trend"
            subtitle="Total variance over time"
            isLoading={isLoading}
            isError={isError}
            isEmpty={!dataPoints || dataPoints.length === 0}
            emptyMessage="No variance data available"
        >
            {/* Summary KPIs */}
            {summaryStats ? (
                <View className="flex-row gap-2 mb-4">
                    <View className="flex-1 bg-blue-500/10 rounded-lg px-3 py-2">
                        <Text className="text-slate-500 text-[9px] uppercase tracking-wider font-bold">Avg Variance</Text>
                        <Text className={`text-xs font-bold font-mono mt-0.5 ${summaryStats.avgVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(summaryStats.avgVariance)}
                        </Text>
                    </View>
                    <View className="flex-1 bg-slate-700/30 rounded-lg px-3 py-2">
                        <Text className="text-slate-500 text-[9px] uppercase tracking-wider font-bold">Total</Text>
                        <Text className={`text-xs font-bold font-mono mt-0.5 ${summaryStats.totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(summaryStats.totalVariance)}
                        </Text>
                    </View>
                    <View className="flex-1 bg-slate-700/30 rounded-lg px-3 py-2">
                        <Text className="text-slate-500 text-[9px] uppercase tracking-wider font-bold">Data Points</Text>
                        <Text className="text-white text-xs font-bold font-mono mt-0.5">
                            {summaryStats.dataPointCount}
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* Legend */}
            <View className="flex-row gap-4 mb-3">
                <View className="flex-row items-center gap-1.5">
                    <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: COLORS.variance }} />
                    <Text className="text-slate-400 text-[10px]">Total Variance (KES)</Text>
                </View>
            </View>

            {/* Chart */}
            <View style={{ alignItems: 'center' }}>
                <LineChart
                    data={lineData}
                    width={CHART_WIDTH - 40}
                    height={120}
                    color={COLORS.variance}
                    dataPointsColor={COLORS.variance}
                    dataPointsRadius={4}
                    thickness={2}
                    curved
                    noOfSections={4}
                    stepValue={5000}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor="#334155"
                    xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 8 }}
                    yAxisTextStyle={{ color: '#64748b', fontSize: 9 }}
                    hideRules
                    backgroundColor="transparent"
                    isAnimated
                    animationDuration={800}
                    showVerticalLines
                    verticalLinesColor="#1e293b"
                    textShiftY={-4}
                    textShiftX={-4}
                    textFontSize={7}
                    textColor="#94a3b8"
                />
            </View>
        </ChartCard>
    );
}

// ─── Main Export ──────────────────────────────────────────────────
export function InventoryReports() {
    return (
        <View>
            {/* Section header */}
            <View className="mb-3 mt-2">
                <Text className="text-white font-bold text-lg">Inventory Reports</Text>
                <Text className="text-slate-500 text-xs">Stock & cash variance trends</Text>
            </View>

            <VarianceTrendChart />
        </View>
    );
}
