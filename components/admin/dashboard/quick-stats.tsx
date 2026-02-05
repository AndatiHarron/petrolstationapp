import React from 'react';
import { View, Text } from 'react-native';
import { useTanksIndex } from '../../../features/api/tank/tank';
import { useProductsIndex } from '../../../features/api/product/product';
import { useStationsIndex } from '../../../features/api/station/station';
import type { TanksIndex200, ProductsIndex200, StationsIndex200 } from '@/features/api/model';

// Skeleton loader for a single stat card
function StatCardSkeleton() {
    return (
        <View className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <View className="h-3 w-16 bg-slate-700 rounded mb-3 animate-pulse" />
            <View className="h-7 w-12 bg-slate-700 rounded mb-2 animate-pulse" />
            <View className="h-2 w-10 bg-slate-700 rounded animate-pulse" />
        </View>
    );
}

// Card component for consistent styling
function StatCard({ title, value, subtitle }: {
    title: string;
    value: string;
    subtitle?: string;
}) {
    return (
        <View className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{title}</Text>
            <Text className="text-2xl font-bold text-white">{value}</Text>
            {subtitle ? <Text className="text-slate-500 text-xs mt-1">{subtitle}</Text> : null}
        </View>
    );
}

export function QuickStats() {
    const { data: tanksResponse, isLoading: isTanksLoading } = useTanksIndex();
    const { data: productsResponse, isLoading: isProductsLoading } = useProductsIndex();
    const { data: stationsResponse, isLoading: isStationsLoading } = useStationsIndex();

    const isLoading = isTanksLoading || isProductsLoading || isStationsLoading;

    // Extract data safely with proper types
    const tanks = (tanksResponse as unknown as TanksIndex200)?.data ?? [];
    const products = (productsResponse as unknown as ProductsIndex200)?.data ?? [];
    const stations = (stationsResponse as unknown as StationsIndex200)?.data ?? [];

    if (isLoading) {
        return (
            <View className="flex-row gap-3 mb-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-row gap-3 mb-6">
            <StatCard title="Stations" value={String(stations.length)} subtitle="Active" />
            <StatCard title="Products" value={String(products.length)} subtitle="Types" />
            <StatCard title="Tanks" value={String(tanks.length)} subtitle="Total" />
        </View>
    );
}
