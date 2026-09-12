import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown, ChevronUp } from 'lucide-react-native';
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
    const [showStationPicker, setShowStationPicker] = useState(false);
    const [showTankPicker, setShowTankPicker] = useState(false);

    // Fetch stations and tanks for selection
    const { data: stationsResponse } = useStationsIndex();
    const { data: tanksResponse } = useTanksIndex();

    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];
    const allTanks = (tanksResponse as TanksIndex200 | undefined)?.data ?? [];
    const tanksForStation = allTanks.filter((t) => t.station_id === stationId);

    const selectedStation = stations.find((s) => s.id === stationId);
    const selectedTank = tanksForStation.find((t) => t.id === tankId);

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
                    <View className="bg-surface-sunken rounded-t-3xl border-t border-surface-border max-h-[90%]">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-surface-border rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-surface-border">
                            <View>
                                <Text className="text-ink text-2xl font-bold">
                                    {isEditing ? 'Edit Nozzle' : 'New Nozzle'}
                                </Text>
                                <Text className="text-ink-muted text-sm">
                                    {isEditing ? 'Update pump/nozzle details' : 'Add a new pump nozzle'}
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-surface items-center justify-center"
                            >
                                <X size={16} color="#8b8b99" />
                            </Pressable>
                        </View>

                        {/* Form */}
                        <ScrollView
                            className="px-6 pt-6"
                            contentContainerStyle={{ paddingBottom: 20 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Name Input */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Nozzle Name *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-brand mb-4"
                                placeholder="e.g. Pump 1 - Nozzle A"
                                placeholderTextColor="#5c5c6b"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            {/* Digits Input */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Counter Digits (1-10) *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-brand mb-4"
                                placeholder="7"
                                placeholderTextColor="#5c5c6b"
                                keyboardType="numeric"
                                value={digits}
                                onChangeText={setDigits}
                            />

                            {/* Station Picker */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Station *
                            </Text>
                            <Pressable
                                onPress={() => setShowStationPicker(!showStationPicker)}
                                className="bg-surface p-4 rounded-xl border border-surface-border mb-2 flex-row justify-between items-center"
                            >
                                <Text className={selectedStation ? 'text-ink' : 'text-ink-muted'}>
                                    {selectedStation?.name ?? 'Select a station'}
                                </Text>
                                {showStationPicker ? (
                                    <ChevronUp size={20} color="#5c5c6b" />
                                ) : (
                                    <ChevronDown size={20} color="#5c5c6b" />
                                )}
                            </Pressable>
                            {showStationPicker ? (
                                <View className="bg-surface rounded-xl border border-surface-border mb-4 max-h-40">
                                    <ScrollView nestedScrollEnabled>
                                        {stations.map((s) => (
                                            <Pressable
                                                key={s.id}
                                                onPress={() => {
                                                    setStationId(s.id);
                                                    setShowStationPicker(false);
                                                }}
                                                className={`p-3 border-b border-surface-border ${stationId === s.id ? 'bg-brand/20' : ''
                                                    }`}
                                            >
                                                <Text className={stationId === s.id ? 'text-brand' : 'text-ink'}>
                                                    {s.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View className="mb-2" />
                            )}

                            {/* Tank Picker */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Tank *
                            </Text>
                            <Pressable
                                onPress={() => stationId ? setShowTankPicker(!showTankPicker) : null}
                                className={`bg-surface p-4 rounded-xl border border-surface-border mb-2 flex-row justify-between items-center ${!stationId ? 'opacity-60' : ''}`}
                            >
                                <Text className={selectedTank ? 'text-ink' : 'text-ink-muted'}>
                                    {selectedTank?.name ?? (stationId ? 'Select a tank' : 'Select a station first')}
                                </Text>
                                {showTankPicker ? (
                                    <ChevronUp size={20} color="#5c5c6b" />
                                ) : (
                                    <ChevronDown size={20} color="#5c5c6b" />
                                )}
                            </Pressable>
                            {showTankPicker && stationId ? (
                                <View className="bg-surface rounded-xl border border-surface-border mb-4 max-h-40">
                                    <ScrollView nestedScrollEnabled>
                                        {tanksForStation.map((t) => (
                                            <Pressable
                                                key={t.id}
                                                onPress={() => {
                                                    setTankId(t.id);
                                                    setShowTankPicker(false);
                                                }}
                                                className={`p-3 border-b border-surface-border ${tankId === t.id ? 'bg-brand/20' : ''
                                                    }`}
                                            >
                                                <Text className={tankId === t.id ? 'text-brand' : 'text-ink'}>
                                                    {t.name}
                                                    {t.product_name ? ` (${t.product_name})` : ''}
                                                </Text>
                                            </Pressable>
                                        ))}
                                        {tanksForStation.length === 0 ? (
                                            <View className="p-3">
                                                <Text className="text-ink-muted text-sm">No tanks at this station</Text>
                                            </View>
                                        ) : null}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View className="mb-2" />
                            )}

                            {/* Current Reading Input */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Current Reading *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-brand mb-4"
                                placeholder="0"
                                placeholderTextColor="#5c5c6b"
                                keyboardType="numeric"
                                value={currentReading}
                                onChangeText={setCurrentReading}
                            />
                        </ScrollView>

                        {/* Footer */}
                        <View className="p-6 border-t border-surface-border bg-surface-sunken pb-10">
                            <Pressable
                                className={`rounded-xl py-4 items-center ${isPending ? 'bg-brand/50' : 'bg-brand'
                                    }`}
                                onPress={handleSubmit}
                                disabled={isPending}
                            >
                                <Text className="text-ink font-bold text-lg">
                                    {isPending ? 'Saving...' : isEditing ? 'Update Nozzle' : 'Create Nozzle'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
