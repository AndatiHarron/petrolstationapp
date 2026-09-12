import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Cylinder, Trash2, Edit2, Plus, Droplet, MapPin } from 'lucide-react-native';
import { useTanksIndex } from '@/features/api/tank/tank';
import type { TankResource, TanksIndex200 } from '@/features/api/model';

// Skeleton loader for a single tank card
export function TankCardSkeleton() {
    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-3">
                <View className="h-5 w-32 bg-surface-border rounded animate-pulse" />
                <View className="h-6 w-20 bg-surface-border rounded animate-pulse" />
            </View>
            <View className="h-2 w-full bg-surface-border rounded-full mb-2 animate-pulse" />
            <View className="flex-row justify-between">
                <View className="h-3 w-24 bg-surface-border rounded animate-pulse" />
                <View className="h-3 w-20 bg-surface-border rounded animate-pulse" />
            </View>
        </View>
    );
}

// Individual tank card
const TankCard = memo(function TankCard({
    tank,
    onDelete,
    onEdit,
    isDeleting
}: {
    tank: TankResource;
    onDelete: (id: string) => void;
    onEdit: (tank: TankResource) => void;
    isDeleting: boolean;
}) {
    const handleDelete = useCallback(() => {
        onDelete(tank.id);
    }, [tank.id, onDelete]);

    const handleEdit = useCallback(() => {
        onEdit(tank);
    }, [tank, onEdit]);

    // Calculate fill percentage
    const fillPercentage = tank.capacity_liters > 0
        ? Math.min((tank.current_volume / tank.capacity_liters) * 100, 100)
        : 0;

    // Determine color based on fill level
    const getFillColor = () => {
        if (fillPercentage < 20) return 'bg-accent';
        if (fillPercentage < 40) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const formatNumber = (num: number) =>
        new Intl.NumberFormat('en-KE').format(Math.round(num));

    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            {/* Header */}
            <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                    <View className="flex-row items-center">
                        <Cylinder size={18} color="#8b8b99" />
                        <Text className="text-ink font-semibold text-base ml-2">{tank.name}</Text>
                    </View>
                    {tank.product_name ? (
                        <View className="flex-row items-center mt-1">
                            <Droplet size={12} color="#040273" />
                            <Text className="text-brand text-sm ml-1">{tank.product_name}</Text>
                        </View>
                    ) : null}
                    {tank.station_name ? (
                        <View className="flex-row items-center mt-1">
                            <MapPin size={12} color="#5c5c6b" />
                            <Text className="text-ink-muted text-xs ml-1">{tank.station_name}</Text>
                        </View>
                    ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={handleEdit}
                        className="p-2 bg-brand-subtle rounded-lg active:opacity-70"
                    >
                        <Edit2 size={16} color="#040273" />
                    </Pressable>
                    <Pressable
                        onPress={handleDelete}
                        disabled={isDeleting}
                        className="p-2 bg-accent-subtle rounded-lg active:opacity-70"
                    >
                        <Trash2 size={16} color={isDeleting ? '#8b8b99' : '#bf0a30'} />
                    </Pressable>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-surface-border rounded-full mb-2 overflow-hidden">
                <View
                    className={`h-full ${getFillColor()} rounded-full`}
                    style={{ width: `${fillPercentage}%` }}
                />
            </View>

            {/* Stats */}
            <View className="flex-row justify-between">
                <Text className="text-ink-muted text-sm">
                    {formatNumber(tank.current_volume)} / {formatNumber(tank.capacity_liters)} L
                </Text>
                <Text className="text-ink-muted text-sm">
                    {fillPercentage.toFixed(1)}% full
                </Text>
            </View>
        </View>
    );
});

interface TanksListProps {
    onAddTank?: () => void;
    onEditTank?: (tank: TankResource) => void;
    onDeleteTank?: (id: string) => void;
}

export function TanksList({ onAddTank, onEditTank, onDeleteTank }: TanksListProps) {
    const { data: tanksResponse, isLoading, refetch, isRefetching } = useTanksIndex();

    const handleDelete = useCallback((id: string) => {
        onDeleteTank?.(id);
    }, [onDeleteTank]);

    const handleEdit = useCallback((tank: TankResource) => {
        onEditTank?.(tank);
    }, [onEditTank]);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<TankResource>) => (
        <TankCard
            tank={item}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isDeleting={false}
        />
    ), [handleDelete, handleEdit]);

    const keyExtractor = useCallback((item: TankResource) => item.id, []);

    // Extract data safely
    const tanks = (tanksResponse as TanksIndex200 | undefined)?.data ?? [];

    if (isLoading) {
        return (
            <View>
                <TankCardSkeleton />
                <TankCardSkeleton />
                <TankCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Header with Add Button */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-ink-muted text-sm">
                    {tanks.length} tank{tanks.length !== 1 ? 's' : ''}
                </Text>
                {onAddTank ? (
                    <Pressable
                        onPress={onAddTank}
                        className="flex-row items-center px-3 py-2 bg-emerald-500 rounded-lg active:opacity-80"
                    >
                        <Plus size={16} color="#ffffff" />
                        <Text className="text-ink font-medium text-sm ml-1">Add Tank</Text>
                    </Pressable>
                ) : null}
            </View>

            {tanks.length === 0 ? (
                <View className="bg-surface-sunken border border-surface-border rounded-xl p-8 items-center">
                    <Cylinder size={48} color="#5c5c6b" />
                    <Text className="text-ink-muted text-lg mt-4">No tanks found</Text>
                    <Text className="text-ink-muted text-sm mt-1">Add a tank to get started</Text>
                </View>
            ) : (
                <FlashList
                    data={tanks}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    estimatedItemSize={140}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#8b8b99"
                        />
                    }
                />
            )}
        </View>
    );
}
