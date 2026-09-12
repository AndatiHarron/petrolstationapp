import React from 'react';
import { View, Text } from 'react-native';
import { useProductsIndex } from '../../../features/api/product/product';
import type { ProductsIndex200, ProductResource } from '@/features/api/model';

// Skeleton loader for a single product row
function ProductRowSkeleton() {
    return (
        <View className="flex-row justify-between items-center p-3 bg-surface-sunken rounded-lg border border-surface-border">
            <View className="h-4 w-24 bg-surface-border rounded animate-pulse" />
            <View className="h-4 w-16 bg-surface-border rounded animate-pulse" />
        </View>
    );
}

export function ProductPrices() {
    const { data: productsResponse, isLoading, isError } = useProductsIndex();

    // Extract data safely with proper types
    const products: ProductResource[] = (productsResponse as unknown as ProductsIndex200)?.data ?? [];

    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-6">
            <View className="mb-4">
                <Text className="text-ink font-bold text-lg">Product Prices</Text>
                <Text className="text-ink-muted text-xs">Current pricing</Text>
            </View>

            {isLoading ? (
                <View className="gap-2">
                    <ProductRowSkeleton />
                    <ProductRowSkeleton />
                    <ProductRowSkeleton />
                    <ProductRowSkeleton />
                    <ProductRowSkeleton />
                </View>
            ) : isError ? (
                <View className="items-center py-8">
                    <Text className="text-ink-muted">Error loading products</Text>
                </View>
            ) : products.length > 0 ? (
                <View className="gap-2">
                    {products.slice(0, 5).map((product) => (
                        <View key={product.id} className="flex-row justify-between items-center p-3 bg-surface-sunken rounded-lg border border-surface-border">
                            <Text className="text-ink font-medium">{product.name}</Text>
                            <Text className="text-brand font-bold">
                                KES {Number(product.current_price).toLocaleString()}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View className="items-center py-8">
                    <Text className="text-ink-muted">No products available</Text>
                </View>
            )}
        </View>
    );
}
