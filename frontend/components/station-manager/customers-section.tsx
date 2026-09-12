import React, { memo, useCallback } from 'react';
import { Users } from 'lucide-react-native';
import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
                <Users size={18} color="#34d399" />
                <Text className="text-ink font-bold text-lg">Customers</Text>
                {isLoading && <ActivityIndicator size="small" color="#34d399" />}
                {!isLoading && (
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Text className="text-emerald-700 text-xs font-bold">
                            {customersList.length}
                        </Text>
                    </View>
                )}
            </View>

            {isLoading ? (
                <View style={{ height: 190, marginHorizontal: -16 }}>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
                        <SkeletonCard variant="customer" />
                        <SkeletonCard variant="customer" />
                        <SkeletonCard variant="customer" />
                    </View>
                </View>
            ) : customersList.length === 0 ? (
                <View className="bg-surface-sunken rounded-xl p-4 border border-surface-border">
                    <Text className="text-ink-muted text-center">No customers found</Text>
                </View>
            ) : (
                <View style={{ height: 190, marginHorizontal: -16 }}>
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
