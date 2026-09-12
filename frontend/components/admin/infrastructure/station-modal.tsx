import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { FormSheet, TextField, ToggleField } from '@/components/form-sheet';
import {
    useStationsStore,
    useStationsUpdate,
    getStationsIndexQueryKey
} from '@/features/api/station/station';
import type { StationResource, StoreStationRequest, UpdateStationRequest } from '@/features/api/model';

interface StationModalProps {
    visible: boolean;
    onClose: () => void;
    station?: StationResource; // If provided, we're editing
}

export function StationModal({ visible, onClose, station }: StationModalProps) {
    const queryClient = useQueryClient();
    const isEditing = Boolean(station);

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Reset form when modal opens/closes or station changes
    useEffect(() => {
        if (visible && station) {
            setName(station.name);
            setLocation(station.location ?? '');
            setIsActive(station.is_active);
        } else if (visible) {
            setName('');
            setLocation('');
            setIsActive(true);
        }
    }, [visible, station]);

    const storeMutation = useStationsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getStationsIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to create station. Please try again.');
                console.error('Store station error:', error);
            },
        },
    });

    const updateMutation = useStationsUpdate({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getStationsIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to update station. Please try again.');
                console.error('Update station error:', error);
            },
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Station name is required.');
            return;
        }

        if (isEditing && station) {
            const updateData: UpdateStationRequest = {
                name: name.trim(),
                location: location.trim() || null,
                is_active: isActive,
            };
            updateMutation.mutate({ station: station.id, data: updateData });
        } else {
            const storeData: StoreStationRequest = {
                name: name.trim(),
                location: location.trim() || null,
                is_active: isActive,
            };
            storeMutation.mutate({ data: storeData });
        }
    }, [name, location, isActive, isEditing, station, storeMutation, updateMutation]);

    const isPending = storeMutation.isPending || updateMutation.isPending;

    return (
        <FormSheet
            visible={visible}
            title={isEditing ? 'Edit station' : 'New station'}
            subtitle={isEditing ? station?.name : 'Where tanks, pumps and shifts belong'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? 'Save station' : 'Create station'}
            isPending={isPending}
        >
            <TextField
                label="Station name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Main Street Station"
                autoFocus
            />

            <TextField
                label="Location"
                value={location}
                onChangeText={setLocation}
                placeholder="123 Main Street, Nairobi"
            />

            <ToggleField
                label="Station active"
                hint="Inactive stations keep their history but take no new shifts."
                value={isActive}
                onValueChange={setIsActive}
            />
        </FormSheet>
    );
}
