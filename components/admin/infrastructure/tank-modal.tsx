import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown, Plus, Trash2, ChevronUp } from 'lucide-react-native';
import {
    useTanksStore,
    useTanksUpdate,
    getTanksIndexQueryKey
} from '@/features/api/tank/tank';
import { useStationsIndex } from '@/features/api/station/station';
import { useProductsIndex } from '@/features/api/product/product';
import type {
    TankResource,
    StoreTankRequest,
    UpdateTankRequest,
    StationsIndex200,
    ProductsIndex200,
    StoreTankRequestCalibrationChartItem
} from '@/features/api/model';

interface CalibrationEntry {
    mm: string;
    liters: string;
}

interface TankModalProps {
    visible: boolean;
    onClose: () => void;
    tank?: TankResource; // If provided, we're editing
}

export function TankModal({ visible, onClose, tank }: TankModalProps) {
    const queryClient = useQueryClient();
    const isEditing = Boolean(tank);

    const [name, setName] = useState('');
    const [stationId, setStationId] = useState('');
    const [productId, setProductId] = useState('');
    const [capacityLiters, setCapacityLiters] = useState('');
    const [currentVolume, setCurrentVolume] = useState('');
    const [showStationPicker, setShowStationPicker] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [showCalibrationChart, setShowCalibrationChart] = useState(false);
    const [calibrationEntries, setCalibrationEntries] = useState<CalibrationEntry[]>([]);

    // Fetch stations and products for selection
    const { data: stationsResponse } = useStationsIndex();
    const { data: productsResponse } = useProductsIndex();

    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];
    const products = (productsResponse as ProductsIndex200 | undefined)?.data ?? [];

    const selectedStation = stations.find((s) => s.id === stationId);
    const selectedProduct = products.find((p) => p.id === productId);

    // Reset form when modal opens/closes or tank changes
    useEffect(() => {
        if (visible && tank) {
            setName(tank.name);
            setStationId(tank.station_id);
            setProductId(tank.product_id);
            setCapacityLiters(String(tank.capacity_liters));
            setCurrentVolume(String(tank.current_volume));
            // Load existing calibration chart if available
            if (tank.calibration_chart && Array.isArray(tank.calibration_chart)) {
                setCalibrationEntries(
                    (tank.calibration_chart as StoreTankRequestCalibrationChartItem[]).map((entry) => ({
                        mm: String(entry.mm ?? ''),
                        liters: String(entry.liters ?? ''),
                    }))
                );
                setShowCalibrationChart(tank.calibration_chart.length > 0);
            } else {
                setCalibrationEntries([]);
                setShowCalibrationChart(false);
            }
        } else if (visible) {
            setName('');
            setStationId('');
            setProductId('');
            setCapacityLiters('');
            setCurrentVolume('0');
            setCalibrationEntries([]);
            setShowCalibrationChart(false);
        }
    }, [visible, tank]);

    const storeMutation = useTanksStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to create tank. Please try again.');
                console.error('Store tank error:', error);
            },
        },
    });

    const updateMutation = useTanksUpdate({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Error', 'Failed to update tank. Please try again.');
                console.error('Update tank error:', error);
            },
        },
    });

    // Calibration chart helpers
    const addCalibrationEntry = useCallback(() => {
        setCalibrationEntries((prev) => [...prev, { mm: '', liters: '' }]);
    }, []);

    const removeCalibrationEntry = useCallback((index: number) => {
        setCalibrationEntries((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateCalibrationEntry = useCallback((index: number, field: 'mm' | 'liters', value: string) => {
        setCalibrationEntries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
        );
    }, []);

    const getCalibrationChartData = useCallback((): StoreTankRequestCalibrationChartItem[] | null => {
        if (calibrationEntries.length === 0) {
            return null;
        }

        const validEntries = calibrationEntries
            .filter((entry) => entry.mm.trim() !== '' || entry.liters.trim() !== '')
            .map((entry) => ({
                mm: entry.mm ? parseFloat(entry.mm) : undefined,
                liters: entry.liters ? parseFloat(entry.liters) : undefined,
            }));

        return validEntries.length > 0 ? validEntries : null;
    }, [calibrationEntries]);

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Tank name is required.');
            return;
        }

        if (!stationId) {
            Alert.alert('Validation Error', 'Please select a station.');
            return;
        }

        if (!productId) {
            Alert.alert('Validation Error', 'Please select a product.');
            return;
        }

        const capacityNum = parseFloat(capacityLiters);
        if (isNaN(capacityNum) || capacityNum < 1) {
            Alert.alert('Validation Error', 'Capacity must be at least 1 liter.');
            return;
        }

        const volumeNum = parseFloat(currentVolume) || 0;
        const calibrationChart = getCalibrationChartData();

        if (isEditing && tank) {
            const updateData: UpdateTankRequest = {
                name: name.trim(),
                station_id: stationId,
                product_id: productId,
                capacity_liters: capacityNum,
                current_volume: volumeNum,
                calibration_chart: calibrationChart,
            };
            updateMutation.mutate({ tank: tank.id, data: updateData });
        } else {
            const storeData: StoreTankRequest = {
                name: name.trim(),
                station_id: stationId,
                product_id: productId,
                capacity_liters: capacityNum,
                current_volume: volumeNum,
                calibration_chart: calibrationChart,
            };
            storeMutation.mutate({ data: storeData });
        }
    }, [name, stationId, productId, capacityLiters, currentVolume, getCalibrationChartData, isEditing, tank, storeMutation, updateMutation]);

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
                    <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700 max-h-[90%]">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-slate-700 rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-slate-800">
                            <View>
                                <Text className="text-white text-2xl font-bold">
                                    {isEditing ? 'Edit Tank' : 'New Tank'}
                                </Text>
                                <Text className="text-slate-400 text-sm">
                                    {isEditing ? 'Update tank details' : 'Add a new storage tank'}
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
                            className="px-6 pt-6"
                            contentContainerStyle={{ paddingBottom: 20 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Name Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Tank Name *
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 mb-4"
                                placeholder="e.g. Tank 1"
                                placeholderTextColor="#475569"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            {/* Station Picker */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Station *
                            </Text>
                            <Pressable
                                onPress={() => setShowStationPicker(!showStationPicker)}
                                className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-2 flex-row justify-between items-center"
                            >
                                <Text className={selectedStation ? 'text-white' : 'text-slate-500'}>
                                    {selectedStation?.name ?? 'Select a station'}
                                </Text>
                                <ChevronDown size={20} color="#64748b" />
                            </Pressable>
                            {showStationPicker ? (
                                <View className="bg-slate-800 rounded-xl border border-slate-700 mb-4 max-h-40">
                                    <ScrollView nestedScrollEnabled>
                                        {stations.map((s) => (
                                            <Pressable
                                                key={s.id}
                                                onPress={() => {
                                                    setStationId(s.id);
                                                    setShowStationPicker(false);
                                                }}
                                                className={`p-3 border-b border-slate-700 ${stationId === s.id ? 'bg-blue-600/20' : ''
                                                    }`}
                                            >
                                                <Text className={stationId === s.id ? 'text-blue-400' : 'text-white'}>
                                                    {s.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View className="mb-2" />
                            )}

                            {/* Product Picker */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Product *
                            </Text>
                            <Pressable
                                onPress={() => setShowProductPicker(!showProductPicker)}
                                className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-2 flex-row justify-between items-center"
                            >
                                <Text className={selectedProduct ? 'text-white' : 'text-slate-500'}>
                                    {selectedProduct?.name ?? 'Select a product'}
                                </Text>
                                <ChevronDown size={20} color="#64748b" />
                            </Pressable>
                            {showProductPicker ? (
                                <View className="bg-slate-800 rounded-xl border border-slate-700 mb-4 max-h-40">
                                    <ScrollView nestedScrollEnabled>
                                        {products.map((p) => (
                                            <Pressable
                                                key={p.id}
                                                onPress={() => {
                                                    setProductId(p.id);
                                                    setShowProductPicker(false);
                                                }}
                                                className={`p-3 border-b border-slate-700 ${productId === p.id ? 'bg-blue-600/20' : ''
                                                    }`}
                                            >
                                                <Text className={productId === p.id ? 'text-blue-400' : 'text-white'}>
                                                    {p.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View className="mb-2" />
                            )}

                            {/* Capacity Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Capacity (Liters) *
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 mb-4"
                                placeholder="e.g. 10000"
                                placeholderTextColor="#475569"
                                keyboardType="numeric"
                                value={capacityLiters}
                                onChangeText={setCapacityLiters}
                            />

                            {/* Current Volume Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                Current Volume (Liters)
                            </Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 mb-4"
                                placeholder="0"
                                placeholderTextColor="#475569"
                                keyboardType="numeric"
                                value={currentVolume}
                                onChangeText={setCurrentVolume}
                            />

                            {/* Calibration Chart Section */}
                            <Pressable
                                onPress={() => setShowCalibrationChart(!showCalibrationChart)}
                                className="flex-row items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4"
                            >
                                <View>
                                    <Text className="text-white font-medium">Calibration Chart</Text>
                                    <Text className="text-slate-500 text-xs">
                                        {calibrationEntries.length > 0
                                            ? `${calibrationEntries.length} entries`
                                            : 'Optional - Map mm to liters'}
                                    </Text>
                                </View>
                                {showCalibrationChart ? (
                                    <ChevronUp size={20} color="#64748b" />
                                ) : (
                                    <ChevronDown size={20} color="#64748b" />
                                )}
                            </Pressable>

                            {showCalibrationChart ? (
                                <View className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-4">
                                    {/* Column Headers */}
                                    <View className="flex-row mb-3">
                                        <View className="flex-1 mr-2">
                                            <Text className="text-slate-400 text-xs font-bold uppercase">
                                                Depth (mm)
                                            </Text>
                                        </View>
                                        <View className="flex-1 mr-8">
                                            <Text className="text-slate-400 text-xs font-bold uppercase">
                                                Volume (L)
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Calibration Entries */}
                                    {calibrationEntries.map((entry, index) => (
                                        <View key={index} className="flex-row items-center mb-2">
                                            <TextInput
                                                className="flex-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600 mr-2"
                                                placeholder="0"
                                                placeholderTextColor="#475569"
                                                keyboardType="numeric"
                                                value={entry.mm}
                                                onChangeText={(value) => updateCalibrationEntry(index, 'mm', value)}
                                            />
                                            <TextInput
                                                className="flex-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600 mr-2"
                                                placeholder="0"
                                                placeholderTextColor="#475569"
                                                keyboardType="numeric"
                                                value={entry.liters}
                                                onChangeText={(value) => updateCalibrationEntry(index, 'liters', value)}
                                            />
                                            <Pressable
                                                onPress={() => removeCalibrationEntry(index)}
                                                className="p-2 bg-red-500/20 rounded-lg"
                                            >
                                                <Trash2 size={16} color="#ef4444" />
                                            </Pressable>
                                        </View>
                                    ))}

                                    {/* Add Entry Button */}
                                    <Pressable
                                        onPress={addCalibrationEntry}
                                        className="flex-row items-center justify-center py-3 mt-2 bg-slate-700 rounded-lg active:opacity-80"
                                    >
                                        <Plus size={16} color="#94a3b8" />
                                        <Text className="text-slate-400 font-medium ml-2">Add Entry</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </ScrollView>

                        {/* Footer */}
                        <View className="p-6 border-t border-slate-800 bg-slate-900 pb-10">
                            <Pressable
                                className={`rounded-xl py-4 items-center ${isPending ? 'bg-blue-600/50' : 'bg-blue-600'
                                    }`}
                                onPress={handleSubmit}
                                disabled={isPending}
                            >
                                <Text className="text-white font-bold text-lg">
                                    {isPending ? 'Saving...' : isEditing ? 'Update Tank' : 'Create Tank'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
