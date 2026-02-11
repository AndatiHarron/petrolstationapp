import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Truck, Trash2, Edit2, Plus, DollarSign, Mail, Phone } from 'lucide-react-native';
import { useCreditorsIndex } from '@/features/api/creditor/creditor';
import type { SupplierResource, CreditorsIndex200 } from '@/features/api/model';

// Skeleton loader for a single supplier card
function SupplierCardSkeleton() {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="h-5 w-36 bg-slate-700 rounded mb-2 animate-pulse" />
                    <View className="h-3 w-28 bg-slate-700/60 rounded animate-pulse" />
                </View>
                <View className="h-7 w-24 bg-slate-700 rounded-full animate-pulse" />
            </View>
        </View>
    );
}

// Individual supplier card — memoized for FlashList performance
const SupplierCard = memo(function SupplierCard({
    supplier,
    onDelete,
    onEdit,
    isDeleting,
}: {
    supplier: SupplierResource;
    onDelete: (id: string) => void;
    onEdit: (supplier: SupplierResource) => void;
    isDeleting: boolean;
}) {
    const handleDelete = useCallback(() => {
        onDelete(supplier.id);
    }, [supplier.id, onDelete]);

    const handleEdit = useCallback(() => {
        onEdit(supplier);
    }, [supplier, onEdit]);

    const balanceColor =
        supplier.current_balance > 0
            ? 'text-amber-400'
            : supplier.current_balance < 0
                ? 'text-red-400'
                : 'text-emerald-400';

    const balanceBgColor =
        supplier.current_balance > 0
            ? 'bg-amber-500/15'
            : supplier.current_balance < 0
                ? 'bg-red-500/15'
                : 'bg-emerald-500/15';

    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                    <View className="flex-row items-center mb-1.5">
                        <View className="w-8 h-8 rounded-lg bg-sky-500/15 items-center justify-center mr-2.5">
                            <Truck size={16} color="#38bdf8" />
                        </View>
                        <Text className="text-white font-semibold text-base">{supplier.name}</Text>
                    </View>

                    {/* Contact info row */}
                    <View className="flex-row items-center flex-wrap ml-[42px] gap-3">
                        {supplier.email ? (
                            <View className="flex-row items-center">
                                <Mail size={12} color="#64748b" />
                                <Text className="text-slate-500 text-xs ml-1">{supplier.email}</Text>
                            </View>
                        ) : null}
                        {supplier.phone ? (
                            <View className="flex-row items-center">
                                <Phone size={12} color="#64748b" />
                                <Text className="text-slate-500 text-xs ml-1">{supplier.phone}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View className="items-end gap-2">
                    {/* Balance badge */}
                    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${balanceBgColor}`}>
                        <Text className={`text-xs font-bold ml-0.5 font-mono ${balanceColor}`}>
                            KES {Math.abs(supplier.current_balance).toLocaleString()}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View className="flex-row items-center gap-1.5">
                        <Pressable
                            onPress={handleEdit}
                            className="p-2 bg-blue-500/20 rounded-lg active:opacity-70"
                        >
                            <Edit2 size={14} color="#3b82f6" />
                        </Pressable>
                        <Pressable
                            onPress={handleDelete}
                            disabled={isDeleting}
                            className="p-2 bg-red-500/20 rounded-lg active:opacity-70"
                        >
                            <Trash2 size={14} color={isDeleting ? '#94a3b8' : '#ef4444'} />
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
});

interface SuppliersListProps {
    onAddSupplier?: () => void;
    onEditSupplier?: (supplier: SupplierResource) => void;
    onDeleteSupplier?: (id: string) => void;
}

export function SuppliersList({ onAddSupplier, onEditSupplier, onDeleteSupplier }: SuppliersListProps) {
    const { data: creditorsResponse, isLoading, refetch, isRefetching } = useCreditorsIndex();

    const handleDelete = useCallback((id: string) => {
        onDeleteSupplier?.(id);
    }, [onDeleteSupplier]);

    const handleEdit = useCallback((supplier: SupplierResource) => {
        onEditSupplier?.(supplier);
    }, [onEditSupplier]);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<SupplierResource>) => (
        <SupplierCard
            supplier={item}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isDeleting={false}
        />
    ), [handleDelete, handleEdit]);

    const keyExtractor = useCallback((item: SupplierResource) => item.id, []);

    // Extract data safely
    const suppliers = (creditorsResponse as CreditorsIndex200 | undefined)?.data ?? [];

    if (isLoading) {
        return (
            <View>
                <SupplierCardSkeleton />
                <SupplierCardSkeleton />
                <SupplierCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Header with Add Button */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-slate-400 text-sm">
                    {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
                </Text>
                {onAddSupplier ? (
                    <Pressable
                        onPress={onAddSupplier}
                        className="flex-row items-center px-3 py-2 bg-sky-500 rounded-lg active:opacity-80"
                    >
                        <Plus size={16} color="#ffffff" />
                        <Text className="text-white font-medium text-sm ml-1">Add Supplier</Text>
                    </Pressable>
                ) : null}
            </View>

            {suppliers.length === 0 ? (
                <View className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 items-center">
                    <Truck size={48} color="#64748b" />
                    <Text className="text-slate-400 text-lg mt-4">No suppliers found</Text>
                    <Text className="text-slate-500 text-sm mt-1">Add a supplier to get started</Text>
                </View>
            ) : (
                <FlashList
                    data={suppliers}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
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
