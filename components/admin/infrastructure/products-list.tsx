import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Package, Trash2, Edit2, Plus, DollarSign } from 'lucide-react-native';
import { useProductsIndex } from '@/features/api/product/product';
import type { ProductResource, ProductsIndex200 } from '@/features/api/model';

// Skeleton loader for a single product card
export function ProductCardSkeleton() {
    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="h-5 w-28 bg-surface-border rounded mb-2 animate-pulse" />
                    <View className="h-3 w-20 bg-surface-border rounded animate-pulse" />
                </View>
                <View className="h-7 w-24 bg-surface-border rounded animate-pulse" />
            </View>
        </View>
    );
}

// Individual product card
const ProductCard = memo(function ProductCard({
    product,
    onDelete,
    onEdit,
    isDeleting
}: {
    product: ProductResource;
    onDelete: (id: string) => void;
    onEdit: (product: ProductResource) => void;
    isDeleting: boolean;
}) {
    const handleDelete = useCallback(() => {
        onDelete(product.id);
    }, [product.id, onDelete]);

    const handleEdit = useCallback(() => {
        onEdit(product);
    }, [product, onEdit]);

    const formattedPrice = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
    }).format(product.current_price);

    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                        <Package size={18} color="#8b8b99" />
                        <Text className="text-ink font-semibold text-base ml-2">{product.name}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <Text className="text-emerald-400 font-bold text-lg ml-1">{formattedPrice}</Text>
                        <Text className="text-ink-muted text-xs ml-2">VAT: {product.vat_rate * 100}%</Text>
                    </View>
                </View>
                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={handleEdit}
                        className="p-2 bg-brand-subtle rounded-lg active:opacity-70"
                    >
                        <Edit2 size={16} color="#040273" />
                    </Pressable>
                    <Pressable
                        onPress={handleDelete}
                        disabled={isDeleting}
                        className="p-2 bg-accent-subtle rounded-lg active:opacity-70"
                    >
                        <Trash2 size={16} color={isDeleting ? '#8b8b99' : '#bf0a30'} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
});

interface ProductsListProps {
    onAddProduct?: () => void;
    onEditProduct?: (product: ProductResource) => void;
    onDeleteProduct?: (id: string) => void;
}

export function ProductsList({ onAddProduct, onEditProduct, onDeleteProduct }: ProductsListProps) {
    const { data: productsResponse, isLoading, refetch, isRefetching } = useProductsIndex();

    const handleDelete = useCallback((id: string) => {
        onDeleteProduct?.(id);
    }, [onDeleteProduct]);

    const handleEdit = useCallback((product: ProductResource) => {
        onEditProduct?.(product);
    }, [onEditProduct]);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<ProductResource>) => (
        <ProductCard
            product={item}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isDeleting={false}
        />
    ), [handleDelete, handleEdit]);

    const keyExtractor = useCallback((item: ProductResource) => item.id, []);

    // Extract data safely
    const products = (productsResponse as ProductsIndex200 | undefined)?.data ?? [];

    if (isLoading) {
        return (
            <View>
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Header with Add Button */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-ink-muted text-sm">
                    {products.length} product{products.length !== 1 ? 's' : ''}
                </Text>
                {onAddProduct ? (
                    <Pressable
                        onPress={onAddProduct}
                        className="flex-row items-center px-3 py-2 bg-emerald-500 rounded-lg active:opacity-80"
                    >
                        <Plus size={16} color="#ffffff" />
                        <Text className="text-ink font-medium text-sm ml-1">Add Product</Text>
                    </Pressable>
                ) : null}
            </View>

            {products.length === 0 ? (
                <View className="bg-surface-sunken border border-surface-border rounded-xl p-8 items-center">
                    <Package size={48} color="#5c5c6b" />
                    <Text className="text-ink-muted text-lg mt-4">No products found</Text>
                    <Text className="text-ink-muted text-sm mt-1">Add a product to get started</Text>
                </View>
            ) : (
                <FlashList
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#8b8b99"
                        />
                    }
                />
            )}
        </View>
    );
}
