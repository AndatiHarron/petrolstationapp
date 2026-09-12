import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { FormSheet, TextField, ChoiceField } from '@/components/form-sheet';
import {
    useNozzlesStore,
    useNozzlesUpdate,
    getNozzlesIndexQueryKey
} from '@/features/api/nozzle/nozzle';
import { useStationsIndex } from '@/features/api/station/station';
import { useTanksIndex } from '@/features/api/tank/tank';
import type {
    NozzleResource,
    StoreNozzleRequest,
    UpdateNozzleRequest,
    StationsIndex200,
    TanksIndex200
} from '@/features/api/model';

interface NozzleModalProps {
    visible: boolean;
    onClose: () => void;
    nozzle?: NozzleResource; // If provided, we're editing
}

export function NozzleModal({ visible, onClose, nozzle }: NozzleModalProps) {
    const queryClient = useQueryClient();
    const isEditing = Boolean(nozzle);

    const [name, setName] = useState('');
    const [digits, setDigits] = useState('7');
    const [stationId, setStationId] = useState('');
    const [tankId, setTankId] = useState('');
    const [currentReading, setCurrentReading] = useState('0');

    // Fetch stations and tanks for selection
    const { data: stationsResponse } = useStationsIndex();
    const { data: tanksResponse } = useTanksIndex();

    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];
    const allTanks = (tanksResponse as TanksIndex200 | undefined)?.data ?? [];
    const tanksForStation = allTanks.filter((t) => t.station_id === stationId);

    // Reset form when modal opens/closes or nozzle changes
    useEffect(() => {
        if (visible && nozzle) {
            setName(nozzle.name);
            setDigits(String(nozzle.digits));
            setStationId(nozzle.station_id);
            setTankId(nozzle.tank_id);
            setCurrentReading(String(nozzle.current_reading));
        } else if (visible) {
            setName('');
            setDigits('7');
            setStationId('');
            setTankId('');
            setCurrentReading('0');
        }
    }, [visible, nozzle]);

    // Clear tank when station changes and selected tank doesn't belong to new station
    useEffect(() => {
        if (stationId && tankId) {
            const tankBelongsToStation = allTanks.some(
                (t) => t.id === tankId && t.station_id === stationId
            );
            if (!tankBelongsToStation) {
                setTankId('');
            }
        }
    }, [stationId, tankId, allTanks]);

    const storeMutation = useNozzlesStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getNozzlesIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to create nozzle. Please try again.');
                console.error('Store nozzle error:', error);
            },
        },
    });

    const updateMutation = useNozzlesUpdate({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getNozzlesIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to update nozzle. Please try again.');
                console.error('Update nozzle error:', error);
            },
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Nozzle name is required.');
            return;
        }

        const digitsNum = parseInt(digits, 10);
        if (isNaN(digitsNum) || digitsNum < 1 || digitsNum > 10) {
            Alert.alert('Validation Error', 'Digits must be between 1 and 10.');
            return;
        }

        if (!stationId) {
            Alert.alert('Validation Error', 'Please select a station.');
            return;
        }

        if (!tankId) {
            Alert.alert('Validation Error', 'Please select a tank.');
            return;
        }

        const readingNum = parseFloat(currentReading) || 0;
        if (readingNum < 0) {
            Alert.alert('Validation Error', 'Current reading cannot be negative.');
            return;
        }

        if (isEditing && nozzle) {
            const updateData: UpdateNozzleRequest = {
                name: name.trim(),
                digits: digitsNum,
                station_id: stationId,
                tank_id: tankId,
                current_reading: readingNum,
            };
            updateMutation.mutate({ nozzle: nozzle.id, data: updateData });
        } else {
            const storeData: StoreNozzleRequest = {
                name: name.trim(),
                digits: digitsNum,
                station_id: stationId,
                tank_id: tankId,
                current_reading: readingNum,
            };
            storeMutation.mutate({ data: storeData });
        }
    }, [name, digits, stationId, tankId, currentReading, isEditing, nozzle, storeMutation, updateMutation]);

    const isPending = storeMutation.isPending || updateMutation.isPending;

    return (
        <FormSheet
            visible={visible}
            title={isEditing ? 'Edit nozzle' : 'New nozzle'}
            subtitle={isEditing ? nozzle?.name : 'A pump nozzle and its counter'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? 'Save nozzle' : 'Create nozzle'}
            isPending={isPending}
        >
            <TextField
                label="Nozzle name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Pump 1 — Nozzle A"
                autoFocus
            />

            <ChoiceField
                label="Station"
                required
                options={stations.map((s) => ({ value: s.id, label: s.name }))}
                value={stationId || null}
                onSelect={setStationId}
                emptyMessage="Add a station first"
            />

            <ChoiceField
                label="Tank"
                required
                options={tanksForStation.map((t) => ({ value: t.id, label: t.name }))}
                value={tankId || null}
                onSelect={setTankId}
                emptyMessage={stationId ? 'This station has no tanks yet' : 'Choose a station first'}
                hint="Only tanks at the chosen station can be picked."
            />

            <TextField
                label="Counter digits"
                required
                value={digits}
                onChangeText={setDigits}
                placeholder="7"
                keyboardType="numeric"
                hint="How many figures the mechanical counter shows before it rolls over."
            />

            <TextField
                label="Current reading"
                value={currentReading}
                onChangeText={setCurrentReading}
                placeholder="0"
                keyboardType="numeric"
            />
        </FormSheet>
    );
}
