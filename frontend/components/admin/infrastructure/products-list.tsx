import React, { useCallback, memo } from 'react';
import { View, Text } from 'react-native';
import { Package, Percent } from 'lucide-react-native';
import { useProductsIndex } from '@/features/api/product/product';
import type { ProductResource, ProductsIndex200 } from '@/features/api/model';
import { EntityCard, EntityList, Meta, MetaRow } from './shell';

const PRICE = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' });

const ProductCard = memo(function ProductCard({
    product,
    onDelete,
    onEdit,
}: {
    product: ProductResource;
    onDelete: (id: string) => void;
    onEdit: (product: ProductResource) => void;
}) {
    const handleDelete = useCallback(() => onDelete(product.id), [product.id, onDelete]);
    const handleEdit = useCallback(() => onEdit(product), [product, onEdit]);

    return (
        <EntityCard
            Icon={Package}
            title={product.name}
            onEdit={handleEdit}
            onDelete={handleDelete}
        >
            <View className="mt-0.5 flex-row items-baseline gap-2">
                <Text
                    className="text-brand shrink font-mono text-[15px] font-bold"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                >
                    {PRICE.format(product.current_price)}
                </Text>
                <Text className="text-ink-faint text-[10px]">per litre</Text>
            </View>

            <MetaRow>
                <Meta Icon={Percent} text={`VAT ${(product.vat_rate * 100).toFixed(0)}%`} />
            </MetaRow>
        </EntityCard>
    );
});

interface ProductsListProps {
    onAddProduct?: () => void;
    onEditProduct?: (product: ProductResource) => void;
    onDeleteProduct?: (id: string) => void;
}

export function ProductsList({ onAddProduct, onEditProduct, onDeleteProduct }: ProductsListProps) {
    const { data: productsResponse, isLoading, refetch, isRefetching } = useProductsIndex();

    const handleDelete = useCallback((id: string) => onDeleteProduct?.(id), [onDeleteProduct]);
    const handleEdit = useCallback(
        (product: ProductResource) => onEditProduct?.(product),
        [onEditProduct]
    );

    const renderItem = useCallback(
        (item: ProductResource) => (
            <ProductCard product={item} onDelete={handleDelete} onEdit={handleEdit} />
        ),
        [handleDelete, handleEdit]
    );

    const products = (productsResponse as ProductsIndex200 | undefined)?.data ?? [];

    return (
        <EntityList
            items={products}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            noun="product"
            addLabel="Add product"
            onAdd={onAddProduct}
            Icon={Package}
            emptyTitle="No products yet"
            emptyHint="Products carry the pump price and the VAT rate."
        />
    );
}
