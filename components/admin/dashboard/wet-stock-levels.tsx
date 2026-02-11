import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTanksIndex } from '../../../features/api/tank/tank';
import type { TanksIndex200, TankResource } from '@/features/api/model';

// ─── Skeleton Loader ───────────────────────────────────────────────
function TankCardSkeleton() {
    return (
        <View className="w-40 mr-3 bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
                <View className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
                <View className="h-5 w-12 bg-slate-700 rounded-full animate-pulse" />
            </View>
            {/* Tank bar skeleton */}
            <View className="h-3 w-full bg-slate-700/40 rounded-full animate-pulse mb-3" />
            <View className="flex-row justify-between">
                <View className="h-3 w-14 bg-slate-700/30 rounded animate-pulse" />
                <View className="h-3 w-14 bg-slate-700/30 rounded animate-pulse" />
            </View>
            <View className="h-3 w-20 bg-slate-700/30 rounded animate-pulse mt-2" />
        </View>
    );
}

// ─── Tank Card ─────────────────────────────────────────────────────
function TankCard({ tank }: { tank: TankResource }) {
    const level = tank.capacity_liters > 0
        ? Math.min(tank.current_volume / tank.capacity_liters, 1)
        : 0;
    const percentage = Math.round(level * 100);

    // Dynamic color based on fill level
    const getBarColor = () => {
        if (level > 0.6) return 'bg-emerald-500';
        if (level > 0.3) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getBadgeColor = () => {
        if (level > 0.6) return 'bg-emerald-500/20';
        if (level > 0.3) return 'bg-amber-500/20';
        return 'bg-red-500/20';
    };

    const getTextColor = () => {
        if (level > 0.6) return 'text-emerald-400';
        if (level > 0.3) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <View className="w-44 mr-3 bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            {/* Header: tank name + percentage badge */}
            <View className="flex-row items-center justify-between mb-1">
                <Text className="text-white font-bold text-sm flex-1 mr-2" numberOfLines={1}>
                    {tank.name}
                </Text>
                <View className={`${getBadgeColor()} px-2 py-0.5 rounded-full`}>
                    <Text className={`${getTextColor()} text-xs font-bold`}>{percentage}%</Text>
                </View>
            </View>

            {/* Product name */}
            {tank.product_name ? (
                <Text className="text-slate-500 text-xs mb-3">{tank.product_name}</Text>
            ) : (
                <View className="mb-3" />
            )}

            {/* Progress bar */}
            <View className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                <View
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                    className={`h-full ${getBarColor()} rounded-full`}
                />
            </View>

            {/* Volume details */}
            <View className="flex-row justify-between items-baseline">
                <Text className="text-white font-mono text-xs font-bold">
                    {tank.current_volume.toLocaleString()}
                </Text>
                <Text className="text-slate-600 text-[10px]">
                    / {tank.capacity_liters.toLocaleString()} L
                </Text>
            </View>

            {/* Station name */}
            {tank.station_name ? (
                <Text className="text-slate-600 text-[10px] mt-2" numberOfLines={1}>
                    📍 {tank.station_name}
                </Text>
            ) : null}
        </View>
    );
}

// ─── Summary Stats ──────────────────────────────────────────────────
function StockSummary({ tanks }: { tanks: TankResource[] }) {
    const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity_liters, 0);
    const totalVolume = tanks.reduce((sum, t) => sum + t.current_volume, 0);
    const overallLevel = totalCapacity > 0 ? totalVolume / totalCapacity : 0;
    const lowTanks = tanks.filter(t => t.capacity_liters > 0 && (t.current_volume / t.capacity_liters) <= 0.3);

    return (
        <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                <Text className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Total Stock</Text>
                <Text className="text-white font-mono font-bold text-sm mt-1">
                    {totalVolume.toLocaleString()} L
                </Text>
                <Text className="text-slate-600 text-[10px]">
                    {Math.round(overallLevel * 100)}% capacity
                </Text>
            </View>
            <View className={`flex-1 rounded-xl p-3 border ${lowTanks.length > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-700/30'}`}>
                <Text className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Low Stock</Text>
                <Text className={`font-mono font-bold text-sm mt-1 ${lowTanks.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {lowTanks.length} tank{lowTanks.length !== 1 ? 's' : ''}
                </Text>
                <Text className="text-slate-600 text-[10px]">
                    {lowTanks.length > 0 ? 'Below 30%' : 'All healthy'}
                </Text>
            </View>
        </View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────
export function WetStockLevels() {
    const { data: tanksResponse, isLoading, isError } = useTanksIndex();

    const tanks: TankResource[] = (tanksResponse as unknown as TanksIndex200)?.data ?? [];

    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
            <View className="mb-4">
                <Text className="text-white font-bold text-lg">Wet Stock Levels</Text>
                <Text className="text-slate-500 text-xs">Current Tank Readings</Text>
            </View>

            {isLoading ? (
                <>
                    {/* Summary skeleton */}
                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1 bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                            <View className="h-2 w-14 bg-slate-700 rounded animate-pulse mb-2" />
                            <View className="h-4 w-20 bg-slate-700 rounded animate-pulse mb-1" />
                            <View className="h-2 w-16 bg-slate-700 rounded animate-pulse" />
                        </View>
                        <View className="flex-1 bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                            <View className="h-2 w-14 bg-slate-700 rounded animate-pulse mb-2" />
                            <View className="h-4 w-12 bg-slate-700 rounded animate-pulse mb-1" />
                            <View className="h-2 w-16 bg-slate-700 rounded animate-pulse" />
                        </View>
                    </View>
                    {/* Tank cards skeleton */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row">
                            <TankCardSkeleton />
                            <TankCardSkeleton />
                            <TankCardSkeleton />
                        </View>
                    </ScrollView>
                </>
            ) : isError ? (
                <View className="items-center py-8">
                    <Text className="text-slate-500">Error loading tank data</Text>
                </View>
            ) : tanks.length > 0 ? (
                <>
                    <StockSummary tanks={tanks} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row">
                            {tanks.map((tank) => (
                                <TankCard key={tank.id} tank={tank} />
                            ))}
                        </View>
                    </ScrollView>
                </>
            ) : (
                <View className="items-center py-8">
                    <Text className="text-slate-500">No tank data available</Text>
                </View>
            )}
        </View>
    );
}
