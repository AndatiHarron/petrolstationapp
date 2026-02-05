import React, { memo, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { useCustomersIndex } from '@/features/api/customer/customer';
import type { CustomersIndex200, AuthenticationExceptionResponse, CustomerResource } from '@/features/api/model';
import { CustomerCard } from './customer-card';
import { SkeletonCard } from './skeleton-card';

// Type guard for successful API response
function hasData<T extends { data: unknown }>(
    response: T | AuthenticationExceptionResponse | undefined
): response is T {
    return response !== undefined && 'data' in response;
}

export const CustomersSection = memo(function CustomersSection() {
    const { data: customersRes, isLoading } = useCustomersIndex();

    const customersList = React.useMemo<CustomerResource[]>(() => {
        const res = customersRes as unknown as CustomersIndex200 | AuthenticationExceptionResponse | undefined;
        if (hasData<CustomersIndex200>(res) && Array.isArray(res.data)) {
            return res.data;
        }
        return [];
    }, [customersRes]);

    const renderCustomerItem = useCallback(
        ({ item }: { item: CustomerResource }) => <CustomerCard customer={item} />,
        []
    );

    const customerKeyExtractor = useCallback(
        (item: CustomerResource, index: number) => `${item.id}-${index}`,
        []
    );

    return (
        <Animated.View entering={FadeInDown.duration(400).delay(400)} className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
                <SymbolView name="person.2.fill" size={18} tintColor="#34d399" />
                <Text className="text-white font-bold text-lg">Customers</Text>
                {isLoading && <ActivityIndicator size="small" color="#34d399" />}
                {!isLoading && (
                    <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Text className="text-emerald-400 text-xs font-bold">
                            {customersList.length}
                        </Text>
                    </View>
                )}
            </View>

            {isLoading ? (
                <View style={{ height: 140, marginHorizontal: -16 }}>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
                        <SkeletonCard variant="customer" />
                        <SkeletonCard variant="customer" />
                        <SkeletonCard variant="customer" />
                    </View>
                </View>
            ) : customersList.length === 0 ? (
                <View className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <Text className="text-slate-500 text-center">No customers found</Text>
                </View>
            ) : (
                <View style={{ height: 140, marginHorizontal: -16 }}>
                    <FlashList
                        data={customersList}
                        renderItem={renderCustomerItem}
                        keyExtractor={customerKeyExtractor}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 32 }}
                        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    />
                </View>
            )}
        </Animated.View>
    );
});
