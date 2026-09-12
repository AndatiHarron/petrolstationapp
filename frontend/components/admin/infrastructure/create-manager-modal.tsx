import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, ChevronDown } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStationsIndex } from '@/features/api/station/station';
import { useStoreUser } from '@/features/api/user/store-user';
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
    const [showStationPicker, setShowStationPicker] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const { data: stationsResponse } = useStationsIndex();
    const stations: StationResource[] =
        (stationsResponse as StationsIndex200 | undefined)?.data ?? [];

    const selectedStation = stations.find((s) => s.id === selectedStationId);

    useEffect(() => {
        if (visible) {
            setName('');
            setEmail('');
            setPassword('');
            setSelectedStationId(null);
            setShowStationPicker(false);
            setIsPasswordVisible(false);
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
        <Modal
            animationType="slide"
            transparent
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
                    <View className="bg-surface-sunken rounded-t-3xl border-t border-surface-border h-[90%] flex overflow-hidden">
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-surface-border rounded-full" />
                        </View>

                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-surface-border">
                            <View>
                                <Text className="text-ink text-2xl font-bold">
                                    New Manager
                                </Text>
                                <Text className="text-ink-muted text-sm">
                                    Create a manager and assign to a station
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-surface items-center justify-center"
                            >
                                <X size={16} color="#8b8b99" />
                            </Pressable>
                        </View>

                        <ScrollView
                            className="flex-1 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Name *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-emerald-500 mb-4"
                                placeholder="e.g. John Doe"
                                placeholderTextColor="#5c5c6b"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                                autoCapitalize="words"
                            />

                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Email *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-emerald-500 mb-4"
                                placeholder="e.g. john@example.com"
                                placeholderTextColor="#5c5c6b"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Password * (min 8 characters)
                            </Text>
                            <View className="relative mb-4">
                                <TextInput
                                    className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-emerald-500 pr-12"
                                    placeholder="Enter password"
                                    placeholderTextColor="#5c5c6b"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                                    onPress={() => setIsPasswordVisible((v) => !v)}
                                    hitSlop={10}
                                    className="absolute right-4 top-0 bottom-0 justify-center"
                                >
                                    <Ionicons
                                        name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color="#8b8b99"
                                    />
                                </Pressable>
                            </View>

                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Station *
                            </Text>
                            <Pressable
                                onPress={() => setShowStationPicker(!showStationPicker)}
                                className="bg-surface p-4 rounded-xl border border-surface-border mb-2 flex-row justify-between items-center"
                            >
                                <Text
                                    className={
                                        selectedStation ? 'text-ink' : 'text-ink-muted'
                                    }
                                >
                                    {selectedStation?.name ?? 'Select a station'}
                                </Text>
                                <ChevronDown size={20} color="#5c5c6b" />
                            </Pressable>
                            {showStationPicker ? (
                                <View className="bg-surface rounded-xl border border-surface-border mb-4 max-h-40">
                                    <ScrollView nestedScrollEnabled>
                                        {stations.length === 0 ? (
                                            <View className="p-4">
                                                <Text className="text-ink-muted text-sm">
                                                    No stations yet. Create one first.
                                                </Text>
                                            </View>
                                        ) : (
                                            stations.map((station) => (
                                                <Pressable
                                                    key={station.id}
                                                    onPress={() => {
                                                        setSelectedStationId(station.id);
                                                        setShowStationPicker(false);
                                                    }}
                                                    className={`p-3 border-b border-surface-border ${
                                                        selectedStationId === station.id
                                                            ? 'bg-emerald-600/20'
                                                            : ''
                                                    }`}
                                                >
                                                    <Text
                                                        className={
                                                            selectedStationId === station.id
                                                                ? 'text-emerald-400'
                                                                : 'text-ink'
                                                        }
                                                    >
                                                        {station.name}
                                                    </Text>
                                                </Pressable>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View className="mb-2" />
                            )}
                        </ScrollView>

                        <View className="p-6 border-t border-surface-border bg-surface-sunken pb-10">
                            <Pressable
                                className={`rounded-xl py-4 items-center ${
                                    isPending ? 'bg-emerald-600/50' : 'bg-emerald-600'
                                }`}
                                onPress={handleSubmit}
                                disabled={isPending || stations.length === 0}
                            >
                                <Text className="text-ink font-bold text-lg">
                                    {isPending
                                        ? 'Creating...'
                                        : 'Create Manager'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
