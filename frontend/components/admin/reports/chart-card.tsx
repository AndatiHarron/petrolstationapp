import React from 'react';
import { View, Text } from 'react-native';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    isLoading?: boolean;
    isError?: boolean;
    errorMessage?: string;
    isEmpty?: boolean;
    emptyMessage?: string;
    children: React.ReactNode;
}

// ─── Skeleton ─────────────────────────────────────────────────────
function ChartCardSkeleton() {
    return (
        <View>
            {/* Summary badges skeleton */}
            <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-surface-sunken rounded-lg px-3 py-2">
                    <View className="h-2 w-10 bg-surface-border rounded animate-pulse mb-1.5" />
                    <View className="h-3 w-14 bg-surface-border rounded animate-pulse" />
                </View>
                <View className="flex-1 bg-surface-sunken rounded-lg px-3 py-2">
                    <View className="h-2 w-10 bg-surface-border rounded animate-pulse mb-1.5" />
                    <View className="h-3 w-14 bg-surface-border rounded animate-pulse" />
                </View>
                <View className="flex-1 bg-surface-sunken rounded-lg px-3 py-2">
                    <View className="h-2 w-10 bg-surface-border rounded animate-pulse mb-1.5" />
                    <View className="h-3 w-14 bg-surface-border rounded animate-pulse" />
                </View>
            </View>

            {/* Chart area skeleton — fake bar chart */}
            <View className="flex-row items-end justify-center gap-3 h-28 px-4">
                <View className="flex-1 bg-surface-border rounded-t-md animate-pulse" style={{ height: '45%' }} />
                <View className="flex-1 bg-surface-border rounded-t-md animate-pulse" style={{ height: '80%' }} />
                <View className="flex-1 bg-surface-border rounded-t-md animate-pulse" style={{ height: '55%' }} />
                <View className="flex-1 bg-surface-border rounded-t-md animate-pulse" style={{ height: '90%' }} />
                <View className="flex-1 bg-surface-border rounded-t-md animate-pulse" style={{ height: '35%' }} />
                <View className="flex-1 bg-surface-border rounded-t-md animate-pulse" style={{ height: '65%' }} />
            </View>
            {/* X-axis line */}
            <View className="h-px bg-surface-border mx-4 mt-0.5" />
            {/* X-axis labels */}
            <View className="flex-row justify-center gap-3 px-4 mt-2">
                <View className="flex-1 h-2 bg-surface-sunken rounded animate-pulse" />
                <View className="flex-1 h-2 bg-surface-sunken rounded animate-pulse" />
                <View className="flex-1 h-2 bg-surface-sunken rounded animate-pulse" />
                <View className="flex-1 h-2 bg-surface-sunken rounded animate-pulse" />
                <View className="flex-1 h-2 bg-surface-sunken rounded animate-pulse" />
                <View className="flex-1 h-2 bg-surface-sunken rounded animate-pulse" />
            </View>
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────
export function ChartCard({
    title,
    subtitle,
    isLoading,
    isError,
    errorMessage,
    isEmpty,
    emptyMessage,
    children,
}: ChartCardProps) {
    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-4">
            {/* Header */}
            <View className="mb-4">
                <Text className="text-ink font-bold text-base">{title}</Text>
                {subtitle ? (
                    <Text className="text-ink-muted text-xs mt-0.5">{subtitle}</Text>
                ) : null}
            </View>

            {/* Content */}
            {isLoading ? (
                <ChartCardSkeleton />
            ) : isError ? (
                <View className="items-center py-8">
                    <Text className="text-accent text-sm font-semibold">Failed to load</Text>
                    <Text className="text-ink-muted text-xs mt-1">
                        {errorMessage || 'Could not load report data'}
                    </Text>
                </View>
            ) : isEmpty ? (
                <View className="items-center py-8">
                    <Text className="text-ink-muted text-sm">
                        {emptyMessage || 'No data available'}
                    </Text>
                </View>
            ) : (
                children
            )}
        </View>
    );
}
