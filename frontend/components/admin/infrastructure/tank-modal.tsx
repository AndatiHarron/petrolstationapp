import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import { FormSheet, Field, TextField, ChoiceField } from '@/components/form-sheet';
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
    const [showCalibrationChart, setShowCalibrationChart] = useState(false);
    const [calibrationEntries, setCalibrationEntries] = useState<CalibrationEntry[]>([]);

    // Fetch stations and products for selection
    const { data: stationsResponse } = useStationsIndex();
    const { data: productsResponse } = useProductsIndex();

    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];
    const products = (productsResponse as ProductsIndex200 | undefined)?.data ?? [];

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
        <FormSheet
            visible={visible}
            title={isEditing ? 'Edit tank' : 'New tank'}
            subtitle={isEditing ? tank?.name : 'Storage a nozzle draws from'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? 'Save tank' : 'Create tank'}
            isPending={isPending}
        >
            <TextField
                label="Tank name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Tank 1"
                autoFocus
            />

            {/* Chips rather than the two collapsing dropdowns this form used to
                open over its own fields. */}
            <ChoiceField
                label="Station"
                required
                options={stations.map((s) => ({ value: s.id, label: s.name }))}
                value={stationId || null}
                onSelect={setStationId}
                emptyMessage="Add a station first"
            />

            <ChoiceField
                label="Product"
                required
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                value={productId || null}
                onSelect={setProductId}
                emptyMessage="Add a product first"
            />

            <TextField
                label="Capacity"
                required
                value={capacityLiters}
                onChangeText={setCapacityLiters}
                placeholder="10000"
                keyboardType="numeric"
                suffix="L"
            />

            <TextField
                label="Current volume"
                value={currentVolume}
                onChangeText={setCurrentVolume}
                placeholder="0"
                keyboardType="numeric"
                suffix="L"
            />

            <Field label="Calibration chart">
                <Pressable
                    onPress={() => setShowCalibrationChart((open) => !open)}
                    accessibilityRole="button"
                    className="flex-row items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-sunken px-3.5 py-3"
                >
                    <View className="min-w-0 flex-1">
                        <Text className="text-ink text-[13px] font-semibold">
                            {calibrationEntries.length > 0
                                ? `${calibrationEntries.length} depth reading${calibrationEntries.length === 1 ? '' : 's'}`
                                : 'Not set'}
                        </Text>
                        <Text className="text-ink-faint text-[10.5px]">
                            Maps a dip reading in mm to litres in the tank.
                        </Text>
                    </View>
                    {showCalibrationChart ? (
                        <ChevronUp size={16} color="#5c5c6b" />
                    ) : (
                        <ChevronDown size={16} color="#5c5c6b" />
                    )}
                </Pressable>

                {showCalibrationChart ? (
                    <View className="mt-2 gap-2 rounded-xl border border-surface-border p-3">
                        <View className="flex-row gap-2">
                            <Text className="text-ink-faint flex-1 text-[9px] font-bold uppercase tracking-widest">
                                Depth (mm)
                            </Text>
                            <Text className="text-ink-faint flex-1 text-[9px] font-bold uppercase tracking-widest">
                                Volume (L)
                            </Text>
                            <View style={{ width: 32 }} />
                        </View>

                        {calibrationEntries.map((entry, index) => (
                            <View key={index} className="flex-row items-center gap-2">
                                <TextInput
                                    className="text-ink h-10 flex-1 rounded-lg border border-surface-border bg-surface-sunken px-3"
                                    style={{ fontSize: 13, paddingVertical: 0 }}
                                    placeholder="0"
                                    placeholderTextColor="#a3a3b2"
                                    keyboardType="numeric"
                                    value={entry.mm}
                                    onChangeText={(value) => updateCalibrationEntry(index, 'mm', value)}
                                />
                                <TextInput
                                    className="text-ink h-10 flex-1 rounded-lg border border-surface-border bg-surface-sunken px-3"
                                    style={{ fontSize: 13, paddingVertical: 0 }}
                                    placeholder="0"
                                    placeholderTextColor="#a3a3b2"
                                    keyboardType="numeric"
                                    value={entry.liters}
                                    onChangeText={(value) => updateCalibrationEntry(index, 'liters', value)}
                                />
                                <Pressable
                                    onPress={() => removeCalibrationEntry(index)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove reading ${index + 1}`}
                                    style={{ width: 32, height: 32, borderRadius: 11 }}
                                    className="items-center justify-center bg-accent-subtle active:opacity-60"
                                >
                                    <Trash2 size={14} color="#bf0a30" />
                                </Pressable>
                            </View>
                        ))}

                        <Pressable
                            onPress={addCalibrationEntry}
                            accessibilityRole="button"
                            className="mt-1 h-10 flex-row items-center justify-center gap-1.5 rounded-lg bg-brand-subtle active:opacity-70"
                        >
                            <Plus size={14} color="#040273" />
                            <Text className="text-brand text-[11px] font-bold uppercase tracking-wider">
                                Add reading
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
            </Field>
        </FormSheet>
    );
}
