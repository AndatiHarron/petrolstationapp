import React, { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Car, CreditCard, ChevronRight, User } from 'lucide-react-native';
import type { CreditSaleResource, CreditSalesIndex200, AuthenticationExceptionResponse } from '@/features/api/model';
import { useCreditSalesIndex } from '@/features/api/credit-sale/credit-sale';
import { SkeletonCard } from '@/components/station-manager/skeleton-card';

/**
 * The generated CreditSaleResource predates the shift, attendant and credit
 * fields the API now returns, and features/api is Orval output marked "do not
 * edit manually" - so the extra fields are declared here instead. Regenerating
 * the client will supersede this.
 */
type EnrichedCreditSale = CreditSaleResource & {
    shift_number?: string | null;
    station_name?: string | null;
    recorded_by?: string | null;
    customer_credit_limit?: number;
    customer_balance?: number;
    customer_available_credit?: number;
    customer_over_limit?: boolean;
};


function money(value: number): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CreditSalesListProps {
    onItemPress: (creditSaleId: string) => void;
}

interface CreditSaleItemProps {
    item: EnrichedCreditSale;
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
            className="bg-surface border border-surface-border rounded-2xl p-4 mb-3"
            activeOpacity={0.7}
        >
            {/* Who and how much, on the top line. */}
            <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    <View className="bg-brand-subtle shrink-0 rounded-xl p-2.5">
                        <CreditCard size={18} color="#040273" />
                    </View>
                    <View className="min-w-0 flex-1">
                        <Text className="text-ink text-base font-bold" numberOfLines={1}>
                            {item.customer_name || 'Unknown customer'}
                        </Text>
                        <Text className="text-ink-faint text-[11px]" numberOfLines={1}>
                            {formattedDate}
                            {item.station_name ? ` · ${item.station_name}` : ''}
                        </Text>
                    </View>
                </View>

                <View className="shrink-0 flex-row items-center gap-1.5" style={{ maxWidth: '40%' }}>
                    <Text
                        className="text-ink font-mono text-base font-bold"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {formattedAmount}
                    </Text>
                    <ChevronRight size={16} color="#8b8b99" />
                </View>
            </View>

            {/* The attendant and the vehicle: what makes a credit sale
                traceable back to a person and a truck. */}
            <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
                {item.recorded_by ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-surface-sunken px-2 py-1">
                        <User size={11} color="#5c5c6b" />
                        <Text className="text-ink-muted text-[10px] font-semibold" numberOfLines={1}>
                            {item.recorded_by}
                        </Text>
                    </View>
                ) : null}

                {item.vehicle_reg ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-surface-sunken px-2 py-1">
                        <Car size={11} color="#5c5c6b" />
                        <Text className="text-ink font-mono text-[10px] font-bold" numberOfLines={1}>
                            {item.vehicle_reg}
                        </Text>
                    </View>
                ) : null}

                {item.shift_number ? (
                    <View className="rounded-full bg-surface-sunken px-2 py-1">
                        <Text className="text-ink-faint font-mono text-[10px]" numberOfLines={1}>
                            {item.shift_number}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Where this sale leaves their credit standing. */}
            {typeof item.customer_balance === 'number' ? (
                <View className="mt-2.5 rounded-lg bg-surface-sunken px-3 py-2">
                    <View className="flex-row items-baseline justify-between gap-2">
                        <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-wider">
                            Owes now
                        </Text>
                        <Text
                            className={`shrink font-mono text-[11px] font-bold ${
                                item.customer_over_limit ? 'text-accent' : 'text-ink'
                            }`}
                            numberOfLines={1}
                        >
                            {money(item.customer_balance)}
                            {item.customer_credit_limit
                                ? ` of ${money(item.customer_credit_limit)}`
                                : ''}
                        </Text>
                    </View>

                    {item.customer_credit_limit ? (
                        <>
                            <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-border">
                                <View
                                    className={item.customer_over_limit ? 'bg-accent' : 'bg-brand'}
                                    style={{
                                        width: `${Math.min(
                                            (item.customer_balance / item.customer_credit_limit) * 100,
                                            100
                                        )}%`,
                                        height: '100%',
                                    }}
                                />
                            </View>
                            <Text
                                className={`mt-1 text-[10px] ${
                                    item.customer_over_limit ? 'text-accent font-bold' : 'text-ink-faint'
                                }`}
                            >
                                {item.customer_over_limit
                                    ? 'Over their credit limit'
                                    : `${money(item.customer_available_credit ?? 0)} of credit left`}
                            </Text>
                        </>
                    ) : null}
                </View>
            ) : null}
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
        ({ item }: { item: EnrichedCreditSale }) => (
            <CreditSaleItem item={item} onPress={onItemPress} />
        ),
        [onItemPress]
    );

    const keyExtractor = useCallback((item: EnrichedCreditSale) => item.id, []);

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
                <Text className="text-brand text-center font-semibold">Load More</Text>
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
