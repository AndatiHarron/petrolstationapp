import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { FormSheet, TextField } from '@/components/form-sheet';
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
        <FormSheet
            visible={visible}
            title={isEditing ? 'Edit supplier' : 'New supplier'}
            subtitle={isEditing ? supplier?.name : 'Who fuel deliveries are bought from'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? 'Save supplier' : 'Create supplier'}
            isPending={isPending}
        >
            <TextField
                label="Supplier name"
                required
                value={name}
                onChangeText={setName}
                placeholder="TotalEnergies Kenya"
                autoFocus
            />

            <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="orders@supplier.co.ke"
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextField
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+254 712 345 678"
                keyboardType="phone-pad"
            />
        </FormSheet>
    );
}
