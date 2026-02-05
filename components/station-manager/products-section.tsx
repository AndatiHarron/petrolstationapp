import React, { memo, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

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
                <SymbolView name="fuelpump.fill" size={18} tintColor="#60a5fa" />
                <Text className="text-white font-bold text-lg">Products</Text>
                {isLoading && <ActivityIndicator size="small" color="#60a5fa" />}
            </View>

            {isLoading ? (
                <View style={{ height: 120, marginHorizontal: -16 }}>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
                        <SkeletonCard variant="product" />
                        <SkeletonCard variant="product" />
                        <SkeletonCard variant="product" />
                    </View>
                </View>
            ) : productsList.length === 0 ? (
                <View className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <Text className="text-slate-500 text-center">No products found</Text>
                </View>
            ) : (
                <View style={{ height: 120, marginHorizontal: -16 }}>
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
