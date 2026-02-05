import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { ProductResource } from '@/features/api/model';

interface ProductCardProps {
    product: ProductResource;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
    return (
        <View
            className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
            style={{ width: 140 }}
        >
            <Text className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                {product.name}
            </Text>
            <Text className="text-white font-bold text-xl">
                Sh {product.current_price.toLocaleString()}
            </Text>
            <Text className="text-slate-500 text-xs mt-1">
                VAT: {product.vat_rate}%
            </Text>
        </View>
    );
});
