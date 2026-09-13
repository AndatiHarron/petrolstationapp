import React from 'react';
import { View } from 'react-native';
import { Fuel } from 'lucide-react-native';
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

const PRICE = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

interface ProductPricesProps {
    index?: number;
    /** Opens the product sheet on a new record. */
    onAdd?: () => void;
    /** Opens the product sheet on this record, for a price change or a delete. */
    onEdit?: (product: ProductResource) => void;
}

export function ProductPrices({ index = 0, onAdd, onEdit }: ProductPricesProps) {
    const { data: productsResponse, isLoading, isError } = useProductsIndex();

    const products: ProductResource[] =
        (productsResponse as unknown as ProductsIndex200)?.data ?? [];

    return (
        <Section
            title="Product prices"
            subtitle="Tap a product to change its price"
            index={index}
            onAdd={onAdd}
            addLabel="Add product"
        >
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
                        Icon: Fuel,
                        caption: `VAT ${(product.vat_rate * 100).toFixed(0)}%`,
                        // Two decimals so a price column lines up rather than
                        // jumping between 180 and 180.50.
                        value: `KES ${PRICE.format(Number(product.current_price))}`,
                        tone: 'brand' as const,
                        onPress: onEdit ? () => onEdit(product) : undefined,
                    }))}
                />
            )}
        </Section>
    );
}
