import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useOrganizationsIndex } from '@/features/api/organization/organization';
import { useStoreUser } from '@/features/api/user/store-user';
import { FormSheet, TextField, ChoiceField } from '@/components/form-sheet';
import type { OrganizationResource, OrganizationsIndex200 } from '@/features/api/model';

interface CreateAdminModalProps {
    visible: boolean;
    onClose: () => void;
}

export function CreateAdminModal({ visible, onClose }: CreateAdminModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

    const { data: orgsResponse } = useOrganizationsIndex();
    const organizations: OrganizationResource[] =
        (orgsResponse as OrganizationsIndex200 | undefined)?.data ?? [];

    useEffect(() => {
        if (visible) {
            setName('');
            setEmail('');
            setPassword('');
            setSelectedOrgId(null);
        }
    }, [visible]);

    const storeMutation = useStoreUser({
        onSuccess: () => {
            onClose();
        },
        onError: (err: unknown) => {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : null;
            Alert.alert('Could not create administrator', msg ?? 'Please try again.');
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Name required', 'An administrator needs a name.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Email required', 'This is what they sign in with.');
            return;
        }
        if (!password || password.length < 8) {
            Alert.alert('Password too short', 'Use at least 8 characters.');
            return;
        }
        if (!selectedOrgId) {
            Alert.alert('Organization required', 'Choose the tenant they will run.');
            return;
        }

        storeMutation.mutate({
            name: name.trim(),
            email: email.trim(),
            password,
            role: 'admin',
            organization_id: selectedOrgId,
        });
    }, [name, email, password, selectedOrgId, storeMutation]);

    return (
        <FormSheet
            visible={visible}
            title="New administrator"
            subtitle="Someone to run one organization"
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel="Create administrator"
            isPending={storeMutation.isPending}
        >
            <TextField
                label="Full name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Jane Doe"
                autoFocus
            />

            <TextField
                label="Email"
                required
                value={email}
                onChangeText={setEmail}
                placeholder="jane@octane.co.ke"
                keyboardType="email-address"
                autoCapitalize="none"
                hint="This is what they sign in with."
            />

            <TextField
                label="Password"
                required
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
            />

            {/* Chips, not the dropdown that used to open over the fields below. */}
            <ChoiceField
                label="Organization"
                required
                options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                value={selectedOrgId}
                onSelect={setSelectedOrgId}
                emptyMessage="Add an organization first"
            />
        </FormSheet>
    );
}
