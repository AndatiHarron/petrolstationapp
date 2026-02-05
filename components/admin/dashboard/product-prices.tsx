import React from 'react';
import { View, Text } from 'react-native';
import { useProductsIndex } from '../../../features/api/product/product';
import type { ProductsIndex200, ProductResource } from '@/features/api/model';

// Skeleton loader for a single product row
function ProductRowSkeleton() {
    return (
        <View className="flex-row justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
            <View className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
            <View className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
        </View>
    );
}

export function ProductPrices() {
    const { data: productsResponse, isLoading, isError } = useProductsIndex();

    // Extract data safely with proper types
    const products: ProductResource[] = (productsResponse as unknown as ProductsIndex200)?.data ?? [];

    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
            <View className="mb-4">
                <Text className="text-white font-bold text-lg">Product Prices</Text>
                <Text className="text-slate-500 text-xs">Current pricing</Text>
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
                    <Text className="text-slate-500">Error loading products</Text>
                </View>
            ) : products.length > 0 ? (
                <View className="gap-2">
                    {products.slice(0, 5).map((product) => (
                        <View key={product.id} className="flex-row justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                            <Text className="text-slate-300 font-medium">{product.name}</Text>
                            <Text className="text-emerald-400 font-bold">
                                KES {Number(product.current_price).toLocaleString()}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View className="items-center py-8">
                    <Text className="text-slate-500">No products available</Text>
                </View>
            )}
        </View>
    );
}
