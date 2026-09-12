import React, { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CreditCard, ChevronRight } from 'lucide-react-native';
import type { CreditSaleResource, CreditSalesIndex200, AuthenticationExceptionResponse } from '@/features/api/model';
import { useCreditSalesIndex } from '@/features/api/credit-sale/credit-sale';
import { SkeletonCard } from '@/components/station-manager/skeleton-card';

interface CreditSalesListProps {
    onItemPress: (creditSaleId: string) => void;
}

interface CreditSaleItemProps {
    item: CreditSaleResource;
    onPress: (id: string) => void;
}

const CreditSaleItem = memo(function CreditSaleItem({ item, onPress }: CreditSaleItemProps) {
    const handlePress = useCallback(() => {
        onPress(item.id);
    }, [item.id, onPress]);

    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
    }).format(item.amount);

    return (
        <TouchableOpacity
            onPress={handlePress}
            className="bg-surface/70 border border-surface-border rounded-2xl p-4 mb-3"
            activeOpacity={0.7}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <View className="bg-emerald-500/10 p-3 rounded-xl mr-3">
                        <CreditCard size={20} color="#10b981" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-ink font-semibold text-base mb-1" numberOfLines={1}>
                            {item.customer_name || 'Unknown Customer'}
                        </Text>
                        <View className="flex-row items-center">
                            <Text className="text-ink-muted text-sm mr-3">{formattedDate}</Text>
                            {item.vehicle_reg && (
                                <Text className="text-ink-muted text-sm" numberOfLines={1}>
                                    {item.vehicle_reg}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
                <View className="flex-row items-center ml-2">
                    <Text className="text-emerald-400 font-bold text-base mr-2">
                        {formattedAmount}
                    </Text>
                    <ChevronRight size={18} color="#5c5c6b" />
                </View>
            </View>
        </TouchableOpacity>
    );
});

export const CreditSalesList = memo(function CreditSalesList({ onItemPress }: CreditSalesListProps) {
    const [page, setPage] = useState(1);
    const { data: response, isLoading, isFetching } = useCreditSalesIndex({
        query: {
            queryKey: ['credit-sales', page],
        },
    });


    // Type guard to check if response has data
    const hasData = (res: unknown): res is { data: CreditSalesIndex200 } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };

    const creditSalesData = hasData(response) ? response : undefined;


    const creditSales = creditSalesData?.data ?? [];
    const meta = (creditSalesData as unknown as CreditSalesIndex200)?.meta;
    const hasNextPage = meta ? meta.current_page < meta.last_page : false;

    const renderItem = useCallback(
        ({ item }: { item: CreditSaleResource }) => (
            <CreditSaleItem item={item} onPress={onItemPress} />
        ),
        [onItemPress]
    );

    const keyExtractor = useCallback((item: CreditSaleResource) => item.id, []);

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetching) {
            setPage((prev) => prev + 1);
        }
    }, [hasNextPage, isFetching]);

    const renderFooter = useCallback(() => {
        if (!hasNextPage) return null;

        if (isFetching) {
            return (
                <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#10b981" />
                </View>
            );
        }

        return (
            <TouchableOpacity
                onPress={handleLoadMore}
                className="bg-surface-sunken border border-surface-border rounded-xl py-3 mx-1 mb-2"
                activeOpacity={0.7}
            >
                <Text className="text-emerald-400 text-center font-semibold">Load More</Text>
            </TouchableOpacity>
        );
    }, [hasNextPage, isFetching, handleLoadMore]);

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
                    <CreditCard size={40} color="#5c5c6b" />
                </View>
                <Text className="text-ink-muted text-base mt-4">No credit sales found</Text>
            </View>
        );
    }, [isLoading]);


    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-ink text-xl font-bold">Credit Sales</Text>
                {meta && (
                    <Text className="text-ink-muted text-sm">
                        Page {meta.current_page} of {meta.last_page}
                    </Text>
                )}
            </View>
            <FlatList
                data={creditSales as CreditSalesIndex200['data']}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                scrollEnabled={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
            />
        </View>
    );
});
