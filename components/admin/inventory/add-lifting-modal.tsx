import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '../../input-field';
import { Button } from '../../button';
import type { StoreLiftingRequest, TankResource, StationResource, SupplierResource } from '@/features/api/model';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

interface AddLiftingModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: StoreLiftingRequest) => void;
    isSubmitting: boolean;
    stations: StationResource[];
    tanks: TankResource[];
    creditors: SupplierResource[];
    isLoadingStations: boolean;
    isLoadingTanks: boolean;
    isLoadingCreditors: boolean;
}

export function AddLiftingModal({
    visible,
    onClose,
    onSubmit,
    isSubmitting,
    stations,
    tanks,
    creditors,
    isLoadingStations,
    isLoadingTanks,
    isLoadingCreditors,
}: AddLiftingModalProps) {
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
    const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [isCredit, setIsCredit] = useState(false);
    const [formData, setFormData] = useState({
        lifting_date: formatDate(new Date()),
        invoice_number: '',
        volume_liters: 0,
        buying_price_per_liter: 0,
        total_cost: 0,
        tax_paid: 0,
    });

    // Filter tanks by selected station
    const filteredTanks = useMemo(() => {
        if (!selectedStationId) return tanks;
        return tanks.filter(t => t.station_id === selectedStationId);
    }, [tanks, selectedStationId]);


    const handleStationChange = (stationId: string) => {
        setSelectedStationId(stationId);
        setSelectedTankId(null); // Reset tank when station changes
    };

    const handleTankChange = (tankId: string) => {
        setSelectedTankId(tankId);
        // Recalculate tax with new tank's VAT rate
        const selectedTank = tanks.find(t => t.id === tankId);
        const vatRate = selectedTank?.product_vat_rate || 0;
        const totalCost = formData.total_cost || 0;
        setFormData(prev => ({
            ...prev,
            tax_paid: totalCost * (vatRate),
        }));
    };

    const handleVolumeOrPriceChange = (field: 'volume_liters' | 'buying_price_per_liter', value: string) => {
        const numValue = parseFloat(value) || 0;
        const updated = { ...formData, [field]: numValue };
        const vol = field === 'volume_liters' ? numValue : formData.volume_liters;
        const price = field === 'buying_price_per_liter' ? numValue : formData.buying_price_per_liter;
        const totalCost = vol * price;
        updated.total_cost = totalCost;

        const selectedTank = tanks.find(t => t.id === selectedTankId);
        const vatRate = selectedTank?.product_vat_rate || 0;
        updated.tax_paid = totalCost * (vatRate);

        setFormData(updated);
    };

    const resetForm = () => {
        setFormData({
            lifting_date: formatDate(new Date()),
            invoice_number: '',
            volume_liters: 0,
            buying_price_per_liter: 0,
            total_cost: 0,
            tax_paid: 0,
        });
        setSelectedStationId(null);
        setSelectedTankId(null);
        setSelectedSupplierId(null);
        setIsCredit(false);
    };

    const handleSubmit = () => {
        if (!selectedStationId) return;
        if (!selectedTankId) return;
        if (!formData.lifting_date || formData.volume_liters <= 0 || formData.buying_price_per_liter <= 0) return;

        onSubmit({
            station_id: selectedStationId,
            tank_id: selectedTankId,
            lifting_date: formData.lifting_date,
            invoice_number: formData.invoice_number || null,
            volume_liters: formData.volume_liters,
            buying_price_per_liter: formData.buying_price_per_liter,
            total_cost: formData.total_cost || formData.volume_liters * formData.buying_price_per_liter,
            tax_paid: formData.tax_paid || null,
            supplier_id: selectedSupplierId || undefined,
            is_credit: isCredit,
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior="padding"
                enabled={Platform.OS === 'ios'}
                className="flex-1 justify-end"
                keyboardVerticalOffset={0}
            >
                <View className="bg-surface-sunken border-t border-surface-border h-[92%] rounded-t-3xl shadow-2xl">
                    {/* Header */}
                    <View className="p-6 border-b border-surface-border flex-row justify-between items-center bg-surface-sunken rounded-t-3xl">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center">
                                <Ionicons name="add" size={22} color="#3b82f6" />
                            </View>
                            <Text className="text-xl font-bold text-ink">New Lifting</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close-circle" size={28} color="#5c5c6b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        className="flex-1 p-6"
                        contentContainerStyle={{ paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Station Selector */}
                        <View className="mb-5">
                            <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-2">Station *</Text>
                            {isLoadingStations ? (
                                <View className="h-12 items-center justify-center">
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                </View>
                            ) : stations.length === 0 ? (
                                <View className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4">
                                    <Text className="text-amber-400 text-sm">No stations found.</Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        {stations.map((station) => (
                                            <TouchableOpacity
                                                key={station.id}
                                                onPress={() => handleStationChange(station.id)}
                                                className={`px-4 py-3 rounded-xl border ${selectedStationId === station.id
                                                    ? 'bg-blue-600 border-blue-500'
                                                    : 'bg-surface border-surface-border'
                                                    }`}
                                            >
                                                <Text className={selectedStationId === station.id ? 'text-ink font-bold' : 'text-ink'}>
                                                    {station.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        {/* Tank Selector */}
                        <View className="mb-5">
                            <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-2">Tank *</Text>
                            {isLoadingTanks ? (
                                <View className="h-12 items-center justify-center">
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                </View>
                            ) : filteredTanks.length === 0 ? (
                                <View className="bg-surface border border-surface-border rounded-xl p-4">
                                    <Text className="text-ink-muted text-sm">
                                        {selectedStationId ? 'No tanks for selected station.' : 'Select a station first.'}
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        {filteredTanks.map((tank) => (
                                            <TouchableOpacity
                                                key={tank.id}
                                                onPress={() => handleTankChange(tank.id)}
                                                className={`px-4 py-3 rounded-xl border ${selectedTankId === tank.id
                                                    ? 'bg-blue-600 border-blue-500'
                                                    : 'bg-surface border-surface-border'
                                                    }`}
                                            >
                                                <Text className={selectedTankId === tank.id ? 'text-ink font-bold' : 'text-ink'}>
                                                    {tank.name}
                                                </Text>
                                                {tank.product_name ? (
                                                    <Text className="text-ink-muted text-xs mt-0.5">{tank.product_name}</Text>
                                                ) : null}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        <InputField
                            label="Lifting Date *"
                            placeholder="YYYY-MM-DD"
                            value={formData.lifting_date}
                            onChangeText={(text) => setFormData({ ...formData, lifting_date: text })}
                        />

                        <InputField
                            label="Invoice Number"
                            placeholder="INV-12345"
                            value={formData.invoice_number}
                            onChangeText={(text) => setFormData({ ...formData, invoice_number: text })}
                        />

                        <InputField
                            label="Volume (Liters) *"
                            placeholder="0"
                            keyboardType="numeric"
                            value={formData.volume_liters ? formData.volume_liters.toString() : ''}
                            onChangeText={(text) => handleVolumeOrPriceChange('volume_liters', text)}
                        />

                        <InputField
                            label="Buying Price per Liter *"
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={formData.buying_price_per_liter ? formData.buying_price_per_liter.toString() : ''}
                            onChangeText={(text) => handleVolumeOrPriceChange('buying_price_per_liter', text)}
                        />

                        {/* Total Cost (Auto-calculated) */}
                        <View className="mb-5">
                            <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-2">Total Cost (Auto-calculated)</Text>
                            <View className="bg-surface border border-surface-border rounded-xl p-4">
                                <Text className="text-emerald-400 font-mono font-bold text-lg">
                                    KES {(formData.total_cost || 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        {/* Tax Paid (Auto-calculated) */}
                        <View className="mb-5">
                            <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-2">Tax Paid (Auto-calculated)</Text>
                            <View className="bg-surface border border-surface-border rounded-xl p-4">
                                <Text className="text-orange-400 font-mono font-bold text-lg">
                                    KES {(formData.tax_paid || 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        {/* Supplier Selector */}
                        <View className="mb-5">
                            <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-2">Supplier (Optional)</Text>
                            {isLoadingCreditors ? (
                                <View className="h-12 items-center justify-center">
                                    <ActivityIndicator size="small" color="#38bdf8" />
                                </View>
                            ) : creditors.length === 0 ? (
                                <View className="bg-surface border border-surface-border rounded-xl p-4">
                                    <Text className="text-ink-muted text-sm">No suppliers available.</Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => setSelectedSupplierId(null)}
                                            className={`px-4 py-3 rounded-xl border ${selectedSupplierId === null ? 'bg-slate-600 border-slate-500' : 'bg-surface border-surface-border'}`}
                                        >
                                            <Text className={selectedSupplierId === null ? 'text-ink font-bold' : 'text-ink'}>None</Text>
                                        </TouchableOpacity>
                                        {creditors.map((creditor) => (
                                            <TouchableOpacity
                                                key={creditor.id}
                                                onPress={() => setSelectedSupplierId(creditor.id)}
                                                className={`px-4 py-3 rounded-xl border ${selectedSupplierId === creditor.id ? 'bg-sky-600 border-sky-500' : 'bg-surface border-surface-border'}`}
                                            >
                                                <Text className={selectedSupplierId === creditor.id ? 'text-ink font-bold' : 'text-ink'}>{creditor.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        {/* Credit Toggle */}
                        <View className="mb-5 flex-row items-center justify-between bg-surface border border-surface-border rounded-xl p-4">
                            <Text className="text-ink font-medium">Bought on Credit?</Text>
                            <Switch
                                value={isCredit}
                                onValueChange={setIsCredit}
                                trackColor={{ false: '#5c5c6b', true: '#f59e0b' }}
                                thumbColor={isCredit ? '#ffffff' : '#8b8b99'}
                            />
                        </View>

                        {/* Validation hint */}
                        {(!selectedStationId || !selectedTankId || formData.volume_liters <= 0 || formData.buying_price_per_liter <= 0) && (
                            <View className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 mb-4">
                                <Text className="text-amber-400 text-xs">
                                    {!selectedStationId ? '• Select a station' :
                                        !selectedTankId ? '• Select a tank' :
                                            formData.volume_liters <= 0 ? '• Enter volume' :
                                                '• Enter buying price'}
                                </Text>
                            </View>
                        )}

                        <View className="mt-2">
                            <Button
                                title="Record Lifting"
                                onPress={handleSubmit}
                                loading={isSubmitting}
                                disabled={!selectedStationId || !selectedTankId || formData.volume_liters <= 0 || formData.buying_price_per_liter <= 0}
                            />
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
