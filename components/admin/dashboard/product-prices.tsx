import React from 'react';
import { View } from 'react-native';
import { useProductsIndex } from '../../../features/api/product/product';
import type { ProductsIndex200, ProductResource } from '@/features/api/model';
import { Section, SectionEmpty, SectionRows } from './section';

function ProductRowSkeleton() {
    return (
        <View className="flex-row items-center justify-between rounded-lg bg-surface-sunken px-3.5 py-3">
            <View className="h-3 w-24 rounded bg-surface-border" />
            <View className="h-3 w-16 rounded bg-surface-border" />
        </View>
    );
}

export function ProductPrices({ index = 0 }: { index?: number }) {
    const { data: productsResponse, isLoading, isError } = useProductsIndex();

    const products: ProductResource[] =
        (productsResponse as unknown as ProductsIndex200)?.data ?? [];

    return (
        <Section title="Product prices" subtitle="Current pump pricing" index={index}>
            {isLoading ? (
                <View className="gap-2">
                    {[1, 2, 3].map((i) => (
                        <ProductRowSkeleton key={i} />
                    ))}
                </View>
            ) : isError ? (
                <SectionEmpty message="Could not load products" />
            ) : products.length === 0 ? (
                <SectionEmpty message="No products yet" />
            ) : (
                <SectionRows
                    rows={products.slice(0, 5).map((product) => ({
                        key: product.id,
                        label: product.name,
                        // Two decimals so a price column lines up rather than
                        // jumping between 180 and 180.50.
                        value: `KES ${Number(product.current_price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`,
                        tone: 'brand' as const,
                    }))}
                />
            )}
        </Section>
    );
}
