import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
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
}

export function ProductModal({ visible, onClose, product }: ProductModalProps) {
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
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 justify-end"
                >
                    <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-slate-700 rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-slate-800">
                            <View>
                                <Text className="text-white text-2xl font-bold">
                                    {isEditing ? 'Edit Product' : 'New Product'}
                                </Text>
                                <Text className="text-slate-400 text-sm">
                                    {isEditing ? 'Update product details' : 'Add a new fuel product'}
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
                            >
                                <X size={16} color="#94a3b8" />
                            </Pressable>
                        </View>

                        {/* Form */}
                        <View className="px-6 pt-6">
                            {/* Name Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Product Name *
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 mb-4"
                                placeholder="e.g. Super Petrol"
                                placeholderTextColor="#475569"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            {/* Price Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Current Price (KES) *
                            </Text>
                            <View className="relative mb-4">
                                <View className="absolute left-4 top-4 z-10">
                                    <Text className="text-slate-500 font-bold">KES</Text>
                                </View>
                                <TextInput
                                    className="bg-slate-800 text-white p-4 pl-14 rounded-xl border border-slate-700 focus:border-blue-500"
                                    placeholder="0.00"
                                    placeholderTextColor="#475569"
                                    keyboardType="numeric"
                                    value={currentPrice}
                                    onChangeText={setCurrentPrice}
                                />
                            </View>

                            {/* VAT Rate Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                VAT Rate (%)
                            </Text>
                            <View className="relative mb-6">
                                <TextInput
                                    className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500"
                                    placeholder="16"
                                    placeholderTextColor="#475569"
                                    keyboardType="numeric"
                                    value={vatRate}
                                    onChangeText={setVatRate}
                                />
                                <View className="absolute right-4 top-4">
                                    <Text className="text-slate-500 font-bold">%</Text>
                                </View>
                            </View>
                        </View>

                        {/* Footer */}
                        <View className="p-6 border-t border-slate-800 bg-slate-900 pb-10">
                            <Pressable
                                className={`rounded-xl py-4 items-center ${isPending ? 'bg-blue-600/50' : 'bg-blue-600'
                                    }`}
                                onPress={handleSubmit}
                                disabled={isPending}
                            >
                                <Text className="text-white font-bold text-lg">
                                    {isPending ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
