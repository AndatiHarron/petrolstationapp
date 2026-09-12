import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Gauge, Trash2, Edit2, Plus, Droplet, MapPin, Cylinder } from 'lucide-react-native';
import { useNozzlesIndex } from '@/features/api/nozzle/nozzle';
import type { NozzleResource, NozzlesIndex200 } from '@/features/api/model';

const READING_FORMATTER = new Intl.NumberFormat('en-KE', { useGrouping: true });

// Skeleton loader for a single nozzle card
export function NozzleCardSkeleton() {
    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-3">
                <View className="h-5 w-32 bg-surface-border rounded animate-pulse" />
                <View className="h-6 w-20 bg-surface-border rounded animate-pulse" />
            </View>
            <View className="flex-row gap-2">
                <View className="h-3 w-24 bg-surface-border rounded animate-pulse" />
                <View className="h-3 w-20 bg-surface-border rounded animate-pulse" />
            </View>
        </View>
    );
}

// Individual nozzle card
const NozzleCard = memo(function NozzleCard({
    nozzle,
    onDelete,
    onEdit,
    isDeleting
}: {
    nozzle: NozzleResource;
    onDelete: (id: string) => void;
    onEdit: (nozzle: NozzleResource) => void;
    isDeleting: boolean;
}) {
    const handleDelete = useCallback(() => {
        onDelete(nozzle.id);
    }, [nozzle.id, onDelete]);

    const handleEdit = useCallback(() => {
        onEdit(nozzle);
    }, [nozzle, onEdit]);

    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                        <Gauge size={18} color="#8b8b99" />
                        <Text className="text-ink font-semibold text-base ml-2">{nozzle.name}</Text>
                    </View>
                    <View className="flex-row items-center mb-1">
                        <Text className="text-emerald-400 font-bold text-lg">
                            {READING_FORMATTER.format(nozzle.current_reading)}
                        </Text>
                        <Text className="text-ink-muted text-xs ml-2">
                            {nozzle.digits}-digit counter
                        </Text>
                    </View>
                    {nozzle.station_name ? (
                        <View className="flex-row items-center mt-1">
                            <MapPin size={12} color="#5c5c6b" />
                            <Text className="text-ink-muted text-xs ml-1">{nozzle.station_name}</Text>
                        </View>
                    ) : null}
                    {nozzle.tank_name ? (
                        <View className="flex-row items-center mt-1">
                            <Cylinder size={12} color="#5c5c6b" />
                            <Text className="text-ink-muted text-xs ml-1">{nozzle.tank_name}</Text>
                        </View>
                    ) : null}
                    {nozzle.product_name ? (
                        <View className="flex-row items-center mt-1">
                            <Droplet size={12} color="#040273" />
                            <Text className="text-brand text-sm ml-1">{nozzle.product_name}</Text>
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
        </View>
    );
});

interface NozzlesListProps {
    onAddNozzle?: () => void;
    onEditNozzle?: (nozzle: NozzleResource) => void;
    onDeleteNozzle?: (id: string) => void;
}

export function NozzlesList({ onAddNozzle, onEditNozzle, onDeleteNozzle }: NozzlesListProps) {
    const { data: nozzlesResponse, isLoading, refetch, isRefetching } = useNozzlesIndex();

    const handleDelete = useCallback((id: string) => {
        onDeleteNozzle?.(id);
    }, [onDeleteNozzle]);

    const handleEdit = useCallback((nozzle: NozzleResource) => {
        onEditNozzle?.(nozzle);
    }, [onEditNozzle]);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<NozzleResource>) => (
        <NozzleCard
            nozzle={item}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isDeleting={false}
        />
    ), [handleDelete, handleEdit]);

    const keyExtractor = useCallback((item: NozzleResource) => item.id, []);

    // Extract data safely - API returns { data: NozzleResource[], links, meta }
    const nozzles = (nozzlesResponse as NozzlesIndex200 | undefined)?.data ?? [];

    if (isLoading) {
        return (
            <View>
                <NozzleCardSkeleton />
                <NozzleCardSkeleton />
                <NozzleCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Header with Add Button */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-ink-muted text-sm">
                    {nozzles.length} nozzle{nozzles.length !== 1 ? 's' : ''}
                </Text>
                {onAddNozzle ? (
                    <Pressable
                        onPress={onAddNozzle}
                        className="flex-row items-center px-3 py-2 bg-emerald-500 rounded-lg active:opacity-80"
                    >
                        <Plus size={16} color="#ffffff" />
                        <Text className="text-ink font-medium text-sm ml-1">Add Nozzle</Text>
                    </Pressable>
                ) : null}
            </View>

            {nozzles.length === 0 ? (
                <View className="bg-surface-sunken border border-surface-border rounded-xl p-8 items-center">
                    <Gauge size={48} color="#5c5c6b" />
                    <Text className="text-ink-muted text-lg mt-4">No nozzles found</Text>
                    <Text className="text-ink-muted text-sm mt-1">Add a nozzle to get started</Text>
                </View>
            ) : (
                <FlashList
                    data={nozzles}
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
