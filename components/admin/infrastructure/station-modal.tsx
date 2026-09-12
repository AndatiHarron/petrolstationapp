import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, Pressable, TextInput, Switch, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
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
                    <View className="bg-surface-sunken rounded-t-3xl border-t border-surface-border h-[85%] flex overflow-hidden">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-surface-border rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-surface-border">
                            <View>
                                <Text className="text-ink text-2xl font-bold">
                                    {isEditing ? 'Edit Station' : 'New Station'}
                                </Text>
                                <Text className="text-ink-muted text-sm">
                                    {isEditing ? 'Update station details' : 'Add a new station to your organization'}
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
                            className="flex-1 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Name Input */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Station Name *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-brand mb-4"
                                placeholder="e.g. Main Street Station"
                                placeholderTextColor="#5c5c6b"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            {/* Location Input */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Location (Optional)
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-brand mb-4"
                                placeholder="e.g. 123 Main Street, City"
                                placeholderTextColor="#5c5c6b"
                                value={location}
                                onChangeText={setLocation}
                            />

                            {/* Active Toggle */}
                            <View className="flex-row items-center justify-between bg-surface p-4 rounded-xl border border-surface-border mb-6">
                                <Text className="text-ink font-medium">Station Active</Text>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    trackColor={{ false: '#5c5c6b', true: '#10b981' }}
                                    thumbColor={isActive ? '#ffffff' : '#8b8b99'}
                                />
                            </View>
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
                                    {isPending ? 'Saving...' : isEditing ? 'Update Station' : 'Create Station'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
