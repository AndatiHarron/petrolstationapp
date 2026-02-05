import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTanksIndex } from '../../../features/api/tank/tank';
import type { TanksIndex200, TankResource } from '@/features/api/model';

// Skeleton loader for tank visualization
function TankSkeleton() {
    return (
        <View className="items-center gap-2 mx-2">
            <View className="items-center justify-end">
                <View className="h-3 w-8 bg-slate-700 rounded mb-1 animate-pulse" />
                <View className="w-12 h-[120px] bg-slate-700/30 rounded-t-lg animate-pulse" />
            </View>
            <View className="h-2 w-14 bg-slate-700 rounded animate-pulse" />
            <View className="h-2 w-10 bg-slate-700 rounded animate-pulse" />
        </View>
    );
}

// Tank Level Visualization
function TankVisualization({ tank }: { tank: TankResource }) {
    const level = tank.current_volume / tank.capacity_liters;
    const height = Math.max(20, level * 120);
    const color = level > 0.3 ? 'bg-blue-500' : 'bg-red-500';

    return (
        <View className="items-center gap-2 mx-2">
            <View className="items-center justify-end">
                <Text className="text-white font-bold text-xs mb-1">
                    {Math.round(level * 100)}%
                </Text>
                <View className="w-12 rounded-t-lg bg-slate-700/30 overflow-hidden relative h-[120px] justify-end border border-slate-600">
                    <View style={{ height }} className={`w-full ${color} opacity-80`} />
                </View>
            </View>
            <Text className="text-slate-400 text-[10px] font-semibold text-center w-16" numberOfLines={1}>
                {tank.name}
            </Text>
            {tank.product_name ? (
                <Text className="text-slate-500 text-[9px]">{tank.product_name}</Text>
            ) : null}
        </View>
    );
}

export function WetStockLevels() {
    const { data: tanksResponse, isLoading, isError } = useTanksIndex();

    // Extract data safely with proper types
    const tanks: TankResource[] = (tanksResponse as unknown as TanksIndex200)?.data ?? [];

    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
            <View className="mb-4">
                <Text className="text-white font-bold text-lg">Wet Stock Levels</Text>
                <Text className="text-slate-500 text-xs">Current Tank Readings</Text>
            </View>

            {isLoading ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row items-end py-2">
                        <TankSkeleton />
                        <TankSkeleton />
                        <TankSkeleton />
                        <TankSkeleton />
                    </View>
                </ScrollView>
            ) : isError ? (
                <View className="items-center py-8">
                    <Text className="text-slate-500">Error loading tank data</Text>
                </View>
            ) : tanks.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row items-end py-2">
                        {tanks.map((tank) => (
                            <TankVisualization key={tank.id} tank={tank} />
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View className="items-center py-8">
                    <Text className="text-slate-500">No tank data available</Text>
                </View>
            )}
        </View>
    );
}
