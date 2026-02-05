import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { MapPin, Building2, Trash2, Edit2, Plus } from 'lucide-react-native';
import { useStationsIndex } from '@/features/api/station/station';
import type { StationResource, StationsIndex200 } from '@/features/api/model';

// Skeleton loader for a single station card
export function StationCardSkeleton() {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="h-5 w-32 bg-slate-700 rounded mb-2 animate-pulse" />
                    <View className="h-3 w-24 bg-slate-700 rounded animate-pulse" />
                </View>
                <View className="h-6 w-16 bg-slate-700 rounded-full animate-pulse" />
            </View>
        </View>
    );
}

// Individual station card
const StationCard = memo(function StationCard({
    station,
    onDelete,
    onEdit,
    isDeleting
}: {
    station: StationResource;
    onDelete: (id: string) => void;
    onEdit: (station: StationResource) => void;
    isDeleting: boolean;
}) {
    const handleDelete = useCallback(() => {
        onDelete(station.id);
    }, [station.id, onDelete]);

    const handleEdit = useCallback(() => {
        onEdit(station);
    }, [station, onEdit]);

    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                        <Building2 size={18} color="#94a3b8" />
                        <Text className="text-white font-semibold text-base ml-2">{station.name}</Text>
                    </View>
                    {station.location ? (
                        <View className="flex-row items-center">
                            <MapPin size={14} color="#64748b" />
                            <Text className="text-slate-400 text-sm ml-1">{station.location}</Text>
                        </View>
                    ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                    <View className={`px-2 py-1 rounded-full ${station.is_active ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <Text className={`text-xs font-medium ${station.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                            {station.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    <Pressable
                        onPress={handleEdit}
                        className="p-2 bg-blue-500/20 rounded-lg active:opacity-70"
                    >
                        <Edit2 size={16} color="#3b82f6" />
                    </Pressable>
                    <Pressable
                        onPress={handleDelete}
                        disabled={isDeleting}
                        className="p-2 bg-red-500/20 rounded-lg active:opacity-70"
                    >
                        <Trash2 size={16} color={isDeleting ? '#94a3b8' : '#ef4444'} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
});

interface StationsListProps {
    onAddStation?: () => void;
    onEditStation?: (station: StationResource) => void;
    onDeleteStation?: (id: string) => void;
}

export function StationsList({ onAddStation, onEditStation, onDeleteStation }: StationsListProps) {
    const { data: stationsResponse, isLoading, refetch, isRefetching } = useStationsIndex();

    const handleDelete = useCallback((id: string) => {
        onDeleteStation?.(id);
    }, [onDeleteStation]);

    const handleEdit = useCallback((station: StationResource) => {
        onEditStation?.(station);
    }, [onEditStation]);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<StationResource>) => (
        <StationCard
            station={item}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isDeleting={false}
        />
    ), [handleDelete, handleEdit]);

    const keyExtractor = useCallback((item: StationResource) => item.id, []);

    // Extract data safely
    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];

    if (isLoading) {
        return (
            <View>
                <StationCardSkeleton />
                <StationCardSkeleton />
                <StationCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Header with Add Button */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-slate-400 text-sm">
                    {stations.length} station{stations.length !== 1 ? 's' : ''}
                </Text>
                {onAddStation ? (
                    <Pressable
                        onPress={onAddStation}
                        className="flex-row items-center px-3 py-2 bg-emerald-500 rounded-lg active:opacity-80"
                    >
                        <Plus size={16} color="#ffffff" />
                        <Text className="text-white font-medium text-sm ml-1">Add Station</Text>
                    </Pressable>
                ) : null}
            </View>

            {stations.length === 0 ? (
                <View className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 items-center">
                    <Building2 size={48} color="#64748b" />
                    <Text className="text-slate-400 text-lg mt-4">No stations found</Text>
                    <Text className="text-slate-500 text-sm mt-1">Add a station to get started</Text>
                </View>
            ) : (
                <FlashList
                    data={stations}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    estimatedItemSize={80}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#94a3b8"
                        />
                    }
                />
            )}
        </View>
    );
}
