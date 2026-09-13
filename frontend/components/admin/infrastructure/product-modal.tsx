import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { FormSheet, TextField } from '@/components/form-sheet';
import {
    useProductsStore,
    useProductsUpdate,
    getProductsIndexQueryKey
} from '@/features/api/product/product';
import type { ProductResource, StoreProductRequest, UpdateProductRequest } from '@/features/api/model';

interface ProductModalProps {
    visible: boolean;
    onClose: () => void;
    product?: ProductResource; // If provided, we're editing
    /** Offered only when editing, and only where the caller can delete. */
    onDelete?: (id: string) => void;
}

export function ProductModal({ visible, onClose, product, onDelete }: ProductModalProps) {
    const queryClient = useQueryClient();
    const isEditing = Boolean(product);

    const [name, setName] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [vatRate, setVatRate] = useState('16');

    // Reset form when modal opens/closes or product changes
    useEffect(() => {
        if (visible && product) {
            setName(product.name);
            setCurrentPrice(String(product.current_price));
            setVatRate(String((product.vat_rate * 100).toFixed(0)));
        } else if (visible) {
            setName('');
            setCurrentPrice('');
            setVatRate('16');
        }
    }, [visible, product]);

    const storeMutation = useProductsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getProductsIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to create product. Please try again.');
                console.error('Store product error:', error);
            },
        },
    });

    const updateMutation = useProductsUpdate({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getProductsIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to update product. Please try again.');
                console.error('Update product error:', error);
            },
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Product name is required.');
            return;
        }

        const priceNum = parseFloat(currentPrice);
        if (isNaN(priceNum) || priceNum < 0) {
            Alert.alert('Validation Error', 'Please enter a valid price.');
            return;
        }

        const vatNum = parseFloat(vatRate);
        if (isNaN(vatNum) || vatNum < 0 || vatNum > 100) {
            Alert.alert('Validation Error', 'VAT rate must be between 0 and 100.');
            return;
        }

        if (isEditing && product) {
            const updateData: UpdateProductRequest = {
                name: name.trim(),
                current_price: priceNum,
                vat_rate: vatNum / 100,
            };
            updateMutation.mutate({ product: product.id, data: updateData });
        } else {
            const storeData: StoreProductRequest = {
                name: name.trim(),
                current_price: priceNum,
                vat_rate: vatNum / 100,
            };
            storeMutation.mutate({ data: storeData });
        }
    }, [name, currentPrice, vatRate, isEditing, product, storeMutation, updateMutation]);

    const isPending = storeMutation.isPending || updateMutation.isPending;

    return (
        <FormSheet
            visible={visible}
            title={isEditing ? 'Edit product' : 'New product'}
            subtitle={isEditing ? product?.name : 'A fuel grade, its price and its VAT rate'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? 'Save product' : 'Create product'}
            isPending={isPending}
            onDelete={isEditing && onDelete && product ? () => onDelete(product.id) : undefined}
            deleteLabel="Delete product"
        >
            <TextField
                label="Product name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Super Petrol"
                autoFocus
            />

            <TextField
                label="Price per litre"
                required
                value={currentPrice}
                onChangeText={setCurrentPrice}
                placeholder="0.00"
                keyboardType="numeric"
                prefix="KES"
            />

            <TextField
                label="VAT rate"
                value={vatRate}
                onChangeText={setVatRate}
                placeholder="16"
                keyboardType="numeric"
                suffix="%"
                hint="Applied to every sale of this product."
            />
        </FormSheet>
    );
}
