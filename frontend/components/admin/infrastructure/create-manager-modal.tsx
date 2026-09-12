import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useStationsIndex } from '@/features/api/station/station';
import { useStoreUser } from '@/features/api/user/store-user';
import { FormSheet, TextField, ChoiceField } from '@/components/form-sheet';
import type { StationResource, StationsIndex200 } from '@/features/api/model';

interface CreateManagerModalProps {
    visible: boolean;
    onClose: () => void;
}

export function CreateManagerModal({ visible, onClose }: CreateManagerModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

    const { data: stationsResponse } = useStationsIndex();
    const stations: StationResource[] =
        (stationsResponse as StationsIndex200 | undefined)?.data ?? [];

    useEffect(() => {
        if (visible) {
            setName('');
            setEmail('');
            setPassword('');
            setSelectedStationId(null);
        }
    }, [visible]);

    const storeMutation = useStoreUser({
        onSuccess: () => {
            onClose();
        },
        onError: (err: unknown) => {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data
                          ?.message
                    : null;
            Alert.alert('Error', msg ?? 'Failed to create manager. Please try again.');
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Name is required.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Validation Error', 'Email is required.');
            return;
        }
        if (!password || password.length < 8) {
            Alert.alert('Validation Error', 'Password must be at least 8 characters.');
            return;
        }
        if (!selectedStationId) {
            Alert.alert('Validation Error', 'Please select a station.');
            return;
        }
        storeMutation.mutate({
            name: name.trim(),
            email: email.trim(),
            password,
            role: 'manager',
            station_id: selectedStationId,
        });
    }, [name, email, password, selectedStationId, storeMutation]);

    const isPending = storeMutation.isPending;

    return (
        <FormSheet
            visible={visible}
            title="New manager"
            subtitle="Create a sign-in and assign it to a station"
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel="Create manager"
            isPending={isPending}
        >
            <TextField
                label="Full name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Jane Wanjiku"
                autoFocus
            />

            <TextField
                label="Email"
                required
                value={email}
                onChangeText={setEmail}
                placeholder="jane@station.co.ke"
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

            <ChoiceField
                label="Station"
                required
                options={stations.map((s) => ({ value: s.id, label: s.name }))}
                value={selectedStationId}
                onSelect={setSelectedStationId}
                emptyMessage="Add a station first"
            />
        </FormSheet>
    );
}
