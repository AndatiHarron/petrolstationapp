import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { ProductResource } from '@/features/api/model';

interface ProductCardProps {
    product: ProductResource;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
    return (
        <View
            className="bg-surface rounded-xl p-4 border border-surface-border"
            style={{ minWidth: 150 }}
        >
            <Text className="text-ink-muted text-xs uppercase tracking-wider mb-1" numberOfLines={2}>
                {product.name}
            </Text>
            <Text className="text-ink font-bold text-xl" adjustsFontSizeToFit numberOfLines={1}>
                Sh {product.current_price.toLocaleString()}
            </Text>
            <Text className="text-ink-muted text-xs mt-1">
                VAT: {Number(product.vat_rate)}%
            </Text>
        </View>
    );
});
