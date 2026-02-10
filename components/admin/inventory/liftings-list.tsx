import React from 'react';
import { View, Text, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import type { LiftingResource, LiftingsIndex200Meta, LiftingsIndex200Links } from '@/features/api/model';
import { PaginationControls } from '../../pagination-controls';

// ─── Skeleton Loader ───────────────────────────────────────────────
function LiftingSkeleton() {
    return (
        <View className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700/50">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <View className="h-5 w-32 bg-slate-700 rounded animate-pulse mb-2" />
                    <View className="h-3 w-20 bg-slate-700/60 rounded animate-pulse" />
                </View>
                <View className="h-6 w-20 bg-slate-700 rounded-full animate-pulse" />
            </View>
            <View className="flex-row justify-between mt-2">
                <View className="h-3 w-24 bg-slate-700/40 rounded animate-pulse" />
                <View className="h-4 w-28 bg-slate-700/40 rounded animate-pulse" />
            </View>
        </View>
    );
}

// ─── Lifting List Item ─────────────────────────────────────────────
function LiftingItem({ item, onPress }: { item: LiftingResource; onPress: (item: LiftingResource) => void }) {
    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700/50"
            activeOpacity={0.7}
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-white text-lg font-bold">{item.tank_name}</Text>
                    <Text className="text-slate-400 text-sm">{item.product_name} • {item.station_name}</Text>
                </View>
                <View className="bg-emerald-500/20 px-3 py-1 rounded-full">
                    <Text className="text-emerald-400 font-bold text-sm">{item.volume_liters.toLocaleString()} L</Text>
                </View>
            </View>
            <View className="flex-row justify-between items-center mt-2">
                <Text className="text-slate-500 text-xs">{new Date(item.lifting_date).toLocaleDateString()}</Text>
                <Text className="text-slate-300 font-mono text-sm">KES {item.total_cost.toLocaleString()}</Text>
            </View>
            {item.invoice_number && (
                <Text className="text-slate-600 text-xs mt-1">Inv: {item.invoice_number}</Text>
            )}
        </TouchableOpacity>
    );
}

// ─── Main List Component ────────────────────────────────────────────
interface LiftingsListProps {
    data: LiftingResource[];
    meta?: LiftingsIndex200Meta;
    links?: LiftingsIndex200Links;
    isLoading: boolean;
    isFetching: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    onPressItem: (item: LiftingResource) => void;
    onPageChange: (page: number) => void;
}

export function LiftingsList({
    data,
    meta,
    links,
    isLoading,
    isFetching,
    refreshing,
    onRefresh,
    onPressItem,
    onPageChange,
}: LiftingsListProps) {
    if (isLoading) {
        return (
            <View className="px-4 pt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <LiftingSkeleton key={i} />
                ))}
            </View>
        );
    }

    return (
        <View className="flex-1 px-4 pt-4">
            <FlashList
                data={data}
                renderItem={({ item }) => <LiftingItem item={item} onPress={onPressItem} />}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
                ListEmptyComponent={() => (
                    <View className="items-center justify-center p-10">
                        <Ionicons name="cube-outline" size={48} color="#475569" />
                        <Text className="text-slate-400 text-center mt-4 text-base font-semibold">No liftings found</Text>
                        <Text className="text-slate-600 text-center text-sm mt-2">Tap + to record a new fuel delivery.</Text>
                    </View>
                )}
                ListFooterComponent={() =>
                    meta && meta.last_page > 1 ? (
                        <PaginationControls
                            currentPage={meta.current_page}
                            lastPage={meta.last_page}
                            onPageChange={onPageChange}
                            loading={isFetching}
                            hasPrev={!!links?.prev}
                            hasNext={!!links?.next}
                        />
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}
