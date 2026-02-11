import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { CustomersIndex200 } from '@/features/api/model';
import { api } from '@/lib/axios';
import { SkeletonCard } from '@/components/station-manager/skeleton-card';

// Fetch customers with debt using has_debt filter
const fetchDebtors = async (): Promise<CustomersIndex200> => {
    const response = await api.get<CustomersIndex200>('/v1/customers', {
        params: { has_debt: 1 },
    });
    return response.data;
};

interface DebtorItemProps {
    item: CustomersIndex200['data'][number];
}

const DebtorItem = memo(function DebtorItem({ item }: DebtorItemProps) {
    const formattedBalance = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(item.current_balance);

    const formattedDate = item.last_sale_date
        ? new Date(item.last_sale_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
        : 'No sales';

    return (
        <View className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <View className="bg-amber-500/10 p-3 rounded-xl mr-3">
                        <AlertTriangle size={20} color="#f59e0b" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-semibold text-base mb-1" numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text className="text-slate-400 text-sm">
                            Last sale: {formattedDate}
                        </Text>
                    </View>
                </View>
                <View className="bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg ml-2">
                    <Text className="text-amber-400 font-bold text-sm">
                        {formattedBalance}
                    </Text>
                </View>
            </View>
        </View>
    );
});

export const DebtorsList = memo(function DebtorsList() {
    const { data: debtorsData, isLoading } = useQuery({
        queryKey: ['/v1/customers', { has_debt: 1 }],
        queryFn: fetchDebtors,
    });

    // Sort by balance descending (highest debt first)
    const sortedDebtors = useMemo(() => {
        const list = debtorsData?.data ?? [];
        return [...list].sort((a, b) => b.current_balance - a.current_balance);
    }, [debtorsData]);

    // Total outstanding
    const totalOutstanding = useMemo(() => {
        return sortedDebtors.reduce((sum, c) => sum + c.current_balance, 0);
    }, [sortedDebtors]);

    const formattedTotal = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(totalOutstanding);

    const renderItem = useCallback(
        ({ item }: { item: CustomersIndex200['data'][number] }) => (
            <DebtorItem item={item} />
        ),
        []
    );

    const keyExtractor = useCallback(
        (item: CustomersIndex200['data'][number]) => item.id,
        []
    );

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
                <View className="bg-slate-800/50 p-6 rounded-2xl">
                    <AlertTriangle size={40} color="#64748b" />
                </View>
                <Text className="text-slate-400 text-base mt-4">No outstanding debts</Text>
                <Text className="text-slate-600 text-sm mt-1">All customers are up to date</Text>
            </View>
        );
    }, [isLoading]);

    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                    <Text className="text-white text-xl font-bold">Debtors</Text>
                    {sortedDebtors.length > 0 && (
                        <View className="bg-amber-500/20 px-2 py-0.5 rounded-full">
                            <Text className="text-amber-400 text-xs font-bold">
                                {sortedDebtors.length}
                            </Text>
                        </View>
                    )}
                </View>
                {sortedDebtors.length > 0 && (
                    <Text className="text-amber-400 text-sm font-semibold">
                        Total: {formattedTotal}
                    </Text>
                )}
            </View>
            <FlatList
                data={sortedDebtors}
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
