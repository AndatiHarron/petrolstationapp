import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTanksIndex } from '../../../features/api/tank/tank';
import type { TanksIndex200, TankResource } from '@/features/api/model';
import { Section, SectionEmpty } from './section';

// ─── Skeleton Loader ───────────────────────────────────────────────
function TankCardSkeleton() {
    return (
        <View className="w-40 mr-3 bg-surface border border-surface-border rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
                <View className="h-4 w-16 bg-surface-border rounded animate-pulse" />
                <View className="h-5 w-12 bg-surface-border rounded-full animate-pulse" />
            </View>
            {/* Tank bar skeleton */}
            <View className="h-3 w-full bg-surface-border rounded-full animate-pulse mb-3" />
            <View className="flex-row justify-between">
                <View className="h-3 w-14 bg-surface-border rounded animate-pulse" />
                <View className="h-3 w-14 bg-surface-border rounded animate-pulse" />
            </View>
            <View className="h-3 w-20 bg-surface-border rounded animate-pulse mt-2" />
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
        if (level > 0.6) return 'bg-brand';
        if (level > 0.3) return 'bg-amber-500';
        return 'bg-accent';
    };

    const getBadgeColor = () => {
        if (level > 0.6) return 'bg-brand-subtle';
        if (level > 0.3) return 'bg-amber-100';
        return 'bg-accent-subtle';
    };

    const getTextColor = () => {
        if (level > 0.6) return 'text-brand';
        if (level > 0.3) return 'text-amber-700';
        return 'text-accent';
    };

    return (
        <View className="w-44 mr-3 bg-surface border border-surface-border rounded-2xl p-4">
            {/* Header: tank name + percentage badge */}
            <View className="flex-row items-center justify-between mb-1">
                <Text className="text-ink font-bold text-sm flex-1 mr-2" numberOfLines={1}>
                    {tank.name}
                </Text>
                <View className={`${getBadgeColor()} px-2 py-0.5 rounded-full`}>
                    <Text className={`${getTextColor()} text-xs font-bold`}>{percentage}%</Text>
                </View>
            </View>

            {/* Product name */}
            {tank.product_name ? (
                <Text className="text-ink-muted text-xs mb-3">{tank.product_name}</Text>
            ) : (
                <View className="mb-3" />
            )}

            {/* Progress bar */}
            <View className="h-3 bg-surface-sunken border border-surface-border rounded-full overflow-hidden mb-3">
                <View
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                    className={`h-full ${getBarColor()} rounded-full`}
                />
            </View>

            {/* Volume details */}
            <View className="flex-row justify-between items-baseline">
                <Text className="text-ink font-mono text-xs font-bold">
                    {tank.current_volume.toLocaleString()}
                </Text>
                <Text className="text-ink-faint text-[10px]">
                    / {tank.capacity_liters.toLocaleString()} L
                </Text>
            </View>

            {/* Station name */}
            {tank.station_name ? (
                <View className="flex-row items-center gap-1 mt-2">
                    <MapPin size={10} color="#8b8b99" />
                    <Text className="text-ink-faint text-[10px] flex-1" numberOfLines={1}>
                        {tank.station_name}
                    </Text>
                </View>
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
        <View className="mb-3 flex-row gap-2 px-4">
            <View className="flex-1 rounded-xl bg-surface-sunken p-3">
                <Text className="text-ink-faint text-[10px] uppercase tracking-wider font-bold">Total Stock</Text>
                <Text className="text-brand font-mono font-bold text-sm mt-1">
                    {totalVolume.toLocaleString()} L
                </Text>
                <Text className="text-ink-faint text-[10px]">
                    {Math.round(overallLevel * 100)}% capacity
                </Text>
            </View>
            <View className={`flex-1 rounded-xl p-3 ${lowTanks.length > 0 ? 'bg-accent-subtle' : 'bg-surface-sunken'}`}>
                <Text className="text-ink-faint text-[10px] uppercase tracking-wider font-bold">Low Stock</Text>
                <Text className={`font-mono font-bold text-sm mt-1 ${lowTanks.length > 0 ? 'text-accent' : 'text-brand'}`}>
                    {lowTanks.length} tank{lowTanks.length !== 1 ? 's' : ''}
                </Text>
                <Text className="text-ink-faint text-[10px]">
                    {lowTanks.length > 0 ? 'Below 30%' : 'All healthy'}
                </Text>
            </View>
        </View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────
export function WetStockLevels({ index = 0 }: { index?: number }) {
    const { data: tanksResponse, isLoading, isError } = useTanksIndex();

    const tanks: TankResource[] = (tanksResponse as unknown as TanksIndex200)?.data ?? [];

    return (
        <Section title="Wet stock" subtitle="Current tank readings" index={index} bleed>

            {isLoading ? (
                <>
                    {/* Summary skeleton */}
                    <View className="mb-3 flex-row gap-2 px-4">
                        <View className="flex-1 rounded-xl bg-surface-sunken p-3">
                            <View className="h-2 w-14 bg-surface-border rounded animate-pulse mb-2" />
                            <View className="h-4 w-20 bg-surface-border rounded animate-pulse mb-1" />
                            <View className="h-2 w-16 bg-surface-border rounded animate-pulse" />
                        </View>
                        <View className="flex-1 rounded-xl bg-surface-sunken p-3">
                            <View className="h-2 w-14 bg-surface-border rounded animate-pulse mb-2" />
                            <View className="h-4 w-12 bg-surface-border rounded animate-pulse mb-1" />
                            <View className="h-2 w-16 bg-surface-border rounded animate-pulse" />
                        </View>
                    </View>
                    {/* Tank cards skeleton */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        <View className="flex-row">
                            <TankCardSkeleton />
                            <TankCardSkeleton />
                            <TankCardSkeleton />
                        </View>
                    </ScrollView>
                </>
            ) : isError ? (
                <View className="px-4">
                    <SectionEmpty message="Could not load tanks" />
                </View>
            ) : tanks.length > 0 ? (
                <>
                    <StockSummary tanks={tanks} />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        <View className="flex-row">
                            {tanks.map((tank) => (
                                <TankCard key={tank.id} tank={tank} />
                            ))}
                        </View>
                    </ScrollView>
                </>
            ) : (
                <View className="px-4">
                    <SectionEmpty message="No tanks set up yet" />
                </View>
            )}
        </Section>
    );
}
