import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { AlertTriangle, Truck } from 'lucide-react-native';
import { useCreditorsIndex } from '@/features/api/creditor/creditor';
import type { CreditorsIndex200, SupplierResource } from '@/features/api/model';
import { SkeletonCard } from '@/components/station-manager/skeleton-card';

interface CreditorItemProps {
    item: SupplierResource;
}

const CreditorItem = memo(function CreditorItem({ item }: CreditorItemProps) {
    const formattedBalance = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(item.current_balance);

    const formattedDate = item.updated_at
        ? new Date(item.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '—';

    return (
        <View className="bg-surface/70 border border-surface-border rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <View className="bg-amber-500/10 p-3 rounded-xl mr-3">
                        <Truck size={20} color="#f59e0b" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-ink font-semibold text-base mb-1" numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text className="text-ink-muted text-sm">Last updated: {formattedDate}</Text>
                    </View>
                </View>
                <View className="bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg ml-2">
                    <Text className="text-amber-400 font-bold text-sm">{formattedBalance}</Text>
                </View>
            </View>
        </View>
    );
});

export const CreditorsList = memo(function CreditorsList() {
    const { data: creditorsResponse, isLoading } = useCreditorsIndex();

    const creditors = useMemo(() => {
        return (creditorsResponse as CreditorsIndex200 | undefined)?.data ?? [];
    }, [creditorsResponse]);

    // Outstanding creditors are suppliers the organization owes money to
    const outstandingCreditors = useMemo(() => {
        return [...creditors]
            .filter((c) => c.current_balance > 0)
            .sort((a, b) => b.current_balance - a.current_balance);
    }, [creditors]);

    const totalOutstanding = useMemo(() => {
        return outstandingCreditors.reduce((sum, c) => sum + c.current_balance, 0);
    }, [outstandingCreditors]);

    const formattedTotal = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(totalOutstanding);

    const renderItem = useCallback(({ item }: { item: SupplierResource }) => {
        return <CreditorItem item={item} />;
    }, []);

    const keyExtractor = useCallback((item: SupplierResource) => item.id, []);

    const renderEmpty = useCallback(() => {
        if (isLoading) {
            return (
                <View>
                    {[1, 2, 3].map((i) => (
                        <View key={i} className="mb-3">
                            <SkeletonCard variant="lifting" />
                        </View>
                    ))}
                </View>
            );
        }

        return (
            <View className="items-center justify-center py-12">
                <View className="bg-surface-sunken p-6 rounded-2xl">
                    <AlertTriangle size={40} color="#5c5c6b" />
                </View>
                <Text className="text-ink-muted text-base mt-4">No outstanding supplier credits</Text>
                <Text className="text-ink-faint text-sm mt-1">All credit liftings are settled</Text>
            </View>
        );
    }, [isLoading]);

    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                    <Text className="text-ink text-xl font-bold">Creditors</Text>
                    {outstandingCreditors.length > 0 && (
                        <View className="bg-amber-500/20 px-2 py-0.5 rounded-full">
                            <Text className="text-amber-400 text-xs font-bold">{outstandingCreditors.length}</Text>
                        </View>
                    )}
                </View>
                {outstandingCreditors.length > 0 && (
                    <Text className="text-amber-400 text-sm font-semibold">Total owed: {formattedTotal}</Text>
                )}
            </View>
            <FlatList
                data={outstandingCreditors}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmpty}
                scrollEnabled={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
            />
        </View>
    );
});

