import { SkeletonCard } from '@/components/station-manager/skeleton-card';
import type { ShiftIndex200, ShiftResource } from '@/features/api/model';
import { useShiftIndex } from '@/features/api/shift/shift';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react-native';
import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

interface ShiftsListProps {
    onItemPress: (shiftId: string) => void;
}

interface ShiftItemProps {
    item: ShiftResource;
    onPress: (id: string) => void;
}

const ShiftItem = memo(function ShiftItem({ item, onPress }: ShiftItemProps) {
    const handlePress = useCallback(() => {
        onPress(item.id);
    }, [item.id, onPress]);

    const literFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
    const literIntegerFormatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    });

    const formattedDate = new Date(item.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const formattedCollected = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
    }).format(item.financials.collected);

    const formattedExpected = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
    }).format(item.financials.expected);

    const variance = item.financials.variance;
    const hasVarianceAlert = item.variance_alert;

    const wetVarianceLiters = item.wet_stock?.variance_liters;
    const wetSoldLiters = item.wet_stock?.total_sold_liters;
    const wetVarianceText =
        typeof wetVarianceLiters === 'number'
            ? `${wetVarianceLiters > 0 ? '+' : ''}${literFormatter.format(wetVarianceLiters)} L`
            : '—';
    const wetSoldText =
        typeof wetSoldLiters === 'number'
            ? `${literIntegerFormatter.format(wetSoldLiters)} L sold`
            : '';

    // Status badge color
    const statusColors = {
        active: 'bg-emerald-500/10 text-emerald-400',
        locked: 'bg-amber-500/10 text-amber-400',
        closed: 'bg-ink-faint/10 text-ink-muted',
    };

    const statusColor = statusColors[item.status as keyof typeof statusColors] || statusColors.active;

    return (
        <TouchableOpacity
            onPress={handlePress}
            className={`border rounded-2xl p-4 mb-3 ${hasVarianceAlert
                ? 'bg-red-950/20 border-red-800/50'
                : 'bg-surface/70 border-surface-border'
                }`}
            activeOpacity={0.7}
        >
            <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center flex-1">
                    <View className={`p-3 rounded-xl mr-3 ${hasVarianceAlert ? 'bg-accent-subtle' : 'bg-brand-subtle'}`}>
                        {hasVarianceAlert ? (
                            <AlertTriangle size={20} color="#bf0a30" />
                        ) : (
                            <Clock size={20} color="#040273" />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-ink font-semibold text-base mb-1" numberOfLines={1}>
                            {item.station_name}
                        </Text>
                        <Text className="text-ink-muted text-sm">{formattedDate}</Text>
                    </View>
                </View>
                <View className={`px-3 py-1 rounded-full ${statusColor}`}>
                    <Text className={`text-xs font-semibold ${statusColor.split(' ')[1]}`}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View className="bg-surface-sunken rounded-xl p-3 mb-2">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-ink-muted text-sm">Expected</Text>
                    <Text className="text-ink font-semibold">{formattedExpected}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                    <Text className="text-ink-muted text-sm">Collected</Text>
                    <Text className="text-emerald-400 font-semibold">{formattedCollected}</Text>
                </View>
            </View>

            <View className="bg-surface-sunken/40 rounded-xl px-3 py-2 mb-2">
                <View className="flex-row items-center justify-between">
                    <Text className="text-ink-muted text-sm">Wet stock variance</Text>
                    <Text
                        className={`font-bold text-sm ${typeof wetVarianceLiters === 'number'
                            ? wetVarianceLiters > 0
                                ? 'text-emerald-400'
                                : wetVarianceLiters < 0
                                    ? 'text-accent'
                                    : 'text-ink-muted'
                            : 'text-ink-muted'
                            }`}
                    >
                        {wetVarianceText}
                    </Text>
                </View>
                {wetSoldText ? (
                    <Text className="text-ink-faint text-xs mt-1">{wetSoldText}</Text>
                ) : null}
            </View>

            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Text className="text-ink-muted text-sm mr-2">Variance:</Text>
                    <Text
                        className={`font-bold text-sm ${variance > 0
                            ? 'text-emerald-400'
                            : variance < 0
                                ? 'text-accent'
                                : 'text-ink-muted'
                            }`}
                    >
                        {variance > 0 ? '+' : ''}
                        {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'KES',
                        }).format(variance)}
                    </Text>
                </View>
                <ChevronRight size={18} color="#5c5c6b" />
            </View>
        </TouchableOpacity>
    );
});

export const ShiftsList = memo(function ShiftsList({ onItemPress }: ShiftsListProps) {
    const [page, setPage] = useState(1);
    const { data: response, isLoading, isFetching } = useShiftIndex({
        query: {
            queryKey: ['shifts', page],
        },
    });

    // Type guard to check if response has data
    const hasData = (res: unknown): res is { data: ShiftIndex200 } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };

    const shifts = hasData(response) ? response.data : undefined;


    const meta = (shifts as unknown as ShiftIndex200)?.meta;
    const hasNextPage = meta ? meta.current_page < meta.last_page : false;

    const renderItem = useCallback(
        ({ item }: { item: ShiftResource }) => (
            <ShiftItem item={item} onPress={onItemPress} />
        ),
        [onItemPress]
    );

    const keyExtractor = useCallback((item: ShiftResource) => item.id, []);

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetching) {
            setPage((prev) => prev + 1);
        }
    }, [hasNextPage, isFetching]);

    const renderFooter = useCallback(() => {
        if (!hasNextPage) return null;

        if (isFetching) {
            return (
                <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#10b981" />
                </View>
            );
        }

        return (
            <TouchableOpacity
                onPress={handleLoadMore}
                className="bg-surface-sunken border border-surface-border rounded-xl py-3 mx-1 mb-2"
                activeOpacity={0.7}
            >
                <Text className="text-emerald-400 text-center font-semibold">Load More</Text>
            </TouchableOpacity>
        );
    }, [hasNextPage, isFetching, handleLoadMore]);

    const renderEmpty = useCallback(() => {
        if (isLoading) {
            return (
                <View>
                    {[1, 2, 3].map((i) => (
                        <View key={i} className="mb-3">
                            <SkeletonCard variant="shift" />
                        </View>
                    ))}
                </View>
            );
        }

        return (
            <View className="items-center justify-center py-12">
                <View className="bg-surface-sunken p-6 rounded-2xl">
                    <Clock size={40} color="#5c5c6b" />
                </View>
                <Text className="text-ink-muted text-base mt-4">No shifts found</Text>
            </View>
        );
    }, [isLoading]);

    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-ink text-xl font-bold">Shifts</Text>
                {meta && (
                    <Text className="text-ink-muted text-sm">
                        Page {meta.current_page} of {meta.last_page}
                    </Text>
                )}
            </View>
            <FlatList
                data={shifts as unknown as ShiftIndex200['data']}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                scrollEnabled={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
            />
        </View>
    );
});
