import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import {
    useCreditorsStore,
    useCreditorsUpdate,
    getCreditorsIndexQueryKey,
} from '@/features/api/creditor/creditor';
import type { SupplierResource, StoreSupplierRequest, UpdateSupplierRequest } from '@/features/api/model';

interface SupplierModalProps {
    visible: boolean;
    onClose: () => void;
    supplier?: SupplierResource; // If provided, we're editing
}

export function SupplierModal({ visible, onClose, supplier }: SupplierModalProps) {
    const queryClient = useQueryClient();
    const isEditing = Boolean(supplier);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Reset form when modal opens/closes or supplier changes
    useEffect(() => {
        if (visible && supplier) {
            setName(supplier.name);
            setEmail(supplier.email ?? '');
            setPhone(supplier.phone ?? '');
        } else if (visible) {
            setName('');
            setEmail('');
            setPhone('');
        }
    }, [visible, supplier]);

    const storeMutation = useCreditorsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getCreditorsIndexQueryKey() });
                onClose();
            },
            onError: () => {
                Alert.alert('Error', 'Failed to create supplier. Please try again.');
            },
        },
    });

    const updateMutation = useCreditorsUpdate({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getCreditorsIndexQueryKey() });
                onClose();
            },
            onError: () => {
                Alert.alert('Error', 'Failed to update supplier. Please try again.');
            },
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Supplier name is required.');
            return;
        }

        if (isEditing && supplier) {
            const updateData: UpdateSupplierRequest = {
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
            };
            updateMutation.mutate({ creditor: supplier.id, data: updateData });
        } else {
            const storeData: StoreSupplierRequest = {
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
            };
            storeMutation.mutate({ data: storeData });
        }
    }, [name, email, phone, isEditing, supplier, storeMutation, updateMutation]);

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
                    behavior="padding"
                    enabled={Platform.OS === 'ios'}
                    className="flex-1 justify-end"
                    keyboardVerticalOffset={0}
                >
                    <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700 h-[85%] flex overflow-hidden">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-slate-700 rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-slate-800">
                            <View>
                                <Text className="text-white text-2xl font-bold">
                                    {isEditing ? 'Edit Supplier' : 'New Supplier'}
                                </Text>
                                <Text className="text-slate-400 text-sm">
                                    {isEditing ? 'Update supplier details' : 'Add a new fuel supplier'}
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
                        <ScrollView
                            className="flex-1 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Name Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Supplier Name *
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-sky-500 mb-4"
                                placeholder="e.g. Total Energies"
                                placeholderTextColor="#475569"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            {/* Email Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Email (Optional)
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-sky-500 mb-4"
                                placeholder="e.g. supplier@example.com"
                                placeholderTextColor="#475569"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Phone Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Phone (Optional)
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-sky-500 mb-6"
                                placeholder="e.g. +254 712 345 678"
                                placeholderTextColor="#475569"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </ScrollView>

                        {/* Footer */}
                        <View className="p-6 border-t border-slate-800 bg-slate-900 pb-10">
                            <Pressable
                                className={`rounded-xl py-4 items-center ${isPending ? 'bg-sky-600/50' : 'bg-sky-600'}`}
                                onPress={handleSubmit}
                                disabled={isPending}
                            >
                                <Text className="text-white font-bold text-lg">
                                    {isPending ? 'Saving...' : isEditing ? 'Update Supplier' : 'Create Supplier'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
