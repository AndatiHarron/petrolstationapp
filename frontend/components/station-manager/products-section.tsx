import React, { memo, useCallback } from 'react';
import { Fuel } from 'lucide-react-native';
import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useProductsIndex } from '@/features/api/product/product';
import type { ProductsIndex200, AuthenticationExceptionResponse, ProductResource } from '@/features/api/model';
import { ProductCard } from './product-card';
import { SkeletonCard } from './skeleton-card';

// Type guard for successful API response
function hasData<T extends { data: unknown }>(
    response: T | AuthenticationExceptionResponse | undefined
): response is T {
    return response !== undefined && 'data' in response;
}

export const ProductsSection = memo(function ProductsSection() {
    const { data: productsRes, isLoading } = useProductsIndex();

    const productsList = React.useMemo<ProductResource[]>(() => {
        const res = productsRes as unknown as ProductsIndex200 | AuthenticationExceptionResponse | undefined;
        if (hasData<ProductsIndex200>(res) && Array.isArray(res.data)) {
            return res.data;
        }
        return [];
    }, [productsRes]);

    const renderProductItem = useCallback(
        ({ item }: { item: ProductResource }) => <ProductCard product={item} />,
        []
    );

    const productKeyExtractor = useCallback(
        (item: ProductResource, index: number) => `${item.id}-${index}`,
        []
    );

    return (
        <Animated.View entering={FadeInDown.duration(400).delay(200)} className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
                <Fuel size={18} color="#60a5fa" />
                <Text className="text-ink font-bold text-lg">Products</Text>
                {isLoading && <ActivityIndicator size="small" color="#60a5fa" />}
            </View>

            {isLoading ? (
                <View style={{ height: 150, marginHorizontal: -16 }}>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
                        <SkeletonCard variant="product" />
                        <SkeletonCard variant="product" />
                        <SkeletonCard variant="product" />
                    </View>
                </View>
            ) : productsList.length === 0 ? (
                <View className="bg-surface-sunken rounded-xl p-4 border border-surface-border">
                    <Text className="text-ink-muted text-center">No products found</Text>
                </View>
            ) : (
                <View style={{ height: 150, marginHorizontal: -16 }}>
                    <FlashList
                        data={productsList}
                        renderItem={renderProductItem}
                        keyExtractor={productKeyExtractor}
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
