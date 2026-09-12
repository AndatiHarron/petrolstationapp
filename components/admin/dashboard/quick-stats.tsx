import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTanksIndex } from '../../../features/api/tank/tank';
import { useProductsIndex } from '../../../features/api/product/product';
import { useStationsIndex } from '../../../features/api/station/station';
import type { TanksIndex200, ProductsIndex200, StationsIndex200 } from '@/features/api/model';

type TabType = 'stations' | 'products' | 'tanks';

interface StatItem {
    id: TabType;
    title: string;
    value: string;
    subtitle: string;
}

// Skeleton loader for a single stat card
function StatCardSkeleton() {
    return (
        <View className="flex-1 min-w-[160px] bg-surface-sunken border border-surface-border rounded-xl p-4">
            <View className="h-3 w-16 bg-surface-border rounded mb-3 animate-pulse" />
            <View className="h-7 w-12 bg-surface-border rounded mb-2 animate-pulse" />
            <View className="h-2 w-10 bg-surface-border rounded animate-pulse" />
        </View>
    );
}

// Card component for consistent styling with navigation
function StatCard({ title, value, subtitle, onPress }: {
    title: string;
    value: string;
    subtitle?: string;
    onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className="flex-1 min-w-[160px] bg-surface border border-surface-border rounded-xl p-4 active:opacity-80"
        >
            <Text className="text-ink-faint text-xs font-semibold uppercase tracking-wider mb-2">{title}</Text>
            <Text className="text-2xl font-bold text-brand">{value}</Text>
            {subtitle ? <Text className="text-ink-muted text-xs mt-1">{subtitle}</Text> : null}
        </Pressable>
    );
}

export function QuickStats() {
    const router = useRouter();
    const { data: tanksResponse, isLoading: isTanksLoading } = useTanksIndex();
    const { data: productsResponse, isLoading: isProductsLoading } = useProductsIndex();
    const { data: stationsResponse, isLoading: isStationsLoading } = useStationsIndex();

    const isLoading = isTanksLoading || isProductsLoading || isStationsLoading;

    // Extract data safely with proper types
    const tanks = (tanksResponse as TanksIndex200 | undefined)?.data ?? [];
    const products = (productsResponse as ProductsIndex200 | undefined)?.data ?? [];
    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];

    const navigateToInfrastructure = useCallback((tab: TabType) => {
        router.push({
            pathname: '/admin/infrastructure',
            params: { tab },
        });
    }, [router]);

    if (isLoading) {
        return (
            <View className="flex-row gap-3 mb-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </View>
        );
    }

    const statsData: StatItem[] = [
        { id: 'stations', title: "Stations", value: String(stations.length), subtitle: "Active" },
        { id: 'products', title: "Products", value: String(products.length), subtitle: "Types" },
        { id: 'tanks', title: "Tanks", value: String(tanks.length), subtitle: "Total" },
    ];

    return (
        <FlatList
            data={statsData}
            renderItem={({ item }) => (
                <StatCard
                    title={item.title}
                    value={item.value}
                    subtitle={item.subtitle}
                    onPress={() => navigateToInfrastructure(item.id)}
                />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row gap-3 mb-6"
        />
    );
}
