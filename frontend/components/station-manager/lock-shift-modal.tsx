import { useCustomersIndex } from '@/features/api/customer/customer';
import { Camera, Gauge, Plus, Ruler, Trash2, TriangleAlert, X } from 'lucide-react-native';
import type { ShiftClosingData200, ShiftResource } from '@/features/api/model';
import { useShiftClosingData } from '@/features/api/shift/shift';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, InteractionManager, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface ClosingNozzle {
    id: string;
    name: string;
    last_reading: number;
}

interface ClosingTank {
    id: string;
    name: string;
    capacity: number;
}

interface LockShiftModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    activeShift: ShiftResource
}



/* -------------------------------------------------------------------------
 * Components
 * ------------------------------------------------------------------------- */

export function LockShiftModal({ visible, onClose, onSubmit, activeShift }: LockShiftModalProps) {
    const { data: shiftClosingRes, isLoading } = useShiftClosingData(activeShift.id);
    const { data: customersRes, isLoading: isLoadingCustomers } = useCustomersIndex();
    const customersList = React.useMemo(() => {
        if (customersRes && 'data' in customersRes && Array.isArray(customersRes.data)) {
            return customersRes.data;
        }
        return [];
    }, [customersRes]);

    const hasCustomers = customersList.length > 0;


    // Derived values with type safety
    const closingData = React.useMemo(() => {
        if (!shiftClosingRes) return null;

        const responseBody = shiftClosingRes as unknown as (ShiftClosingData200 | { message: string });

        if (!('data' in responseBody)) {
            console.error("Invalid closing data format, missing 'data' property", responseBody);
            return null;
        }

        const backendData = responseBody.data;

        if (!backendData) {
            console.error("Backend data is null");
            return null;
        }

        return backendData;
    }, [shiftClosingRes]);



    // Form State
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Meters, 2: Dips, 3: Payments

    // 1. Meter Readings State
    const [meterReadings, setMeterReadings] = useState<Record<string, string>>({});

    // 1b. Meter Evidence (RN file format per nozzle for FormData upload)
    const [meterEvidence, setMeterEvidence] = useState<Record<string, { uri: string; type?: string; name?: string }>>({});

    // 2. Tank Dips State
    const [tankDips, setTankDips] = useState<Record<string, string>>({});

    // Reset form when activeShift changes
    React.useEffect(() => {
        setStep(1);
        setMeterReadings({});
        setMeterEvidence({});
        setTankDips({});
        setCashAmount('');
        setMpesaAmount('');
        setCreditSales([]);
    }, [activeShift.id]);

    // Initialize state when data loads
    React.useEffect(() => {
        if (closingData) {
            setMeterReadings(prev => {
                // Only initialize if empty to preserve user input on re-renders
                if (Object.keys(prev).length > 0) return prev;
                return Object.fromEntries(closingData.nozzles.map(n => [n.nozzle_id, '']));
            });
            setTankDips(prev => {
                if (Object.keys(prev).length > 0) return prev;
                return Object.fromEntries(closingData.tanks.map(t => [t.tank_id, '']));
            });
        }
    }, [closingData]);

    // 3. Payments State
    const [cashAmount, setCashAmount] = useState('');
    const [mpesaAmount, setMpesaAmount] = useState('');
    const [creditSales, setCreditSales] = useState<Array<{ id: string, customerId: string, amount: string, vehicleReg: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helpers
    const handleNext = () => {
        if (step === 1 && !canProceedFromStep1) return;
        if (step < 3) setStep(prev => (prev + 1) as any);
    };

    const handleBack = () => {
        if (step > 1) setStep(prev => (prev - 1) as any);
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        // Validate closing readings >= opening readings
        const invalidReadings = closingData.nozzles.filter(nozzle => {
            const closing = Number(meterReadings[nozzle.nozzle_id]);
            return closing < nozzle.opening_reading;
        });

        if (invalidReadings.length > 0) {
            const names = invalidReadings.map(n => n.pump_name).join(', ');
            Alert.alert(
                'Invalid Meter Readings',
                `Closing reading cannot be less than opening reading for: ${names}`
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const metersWithEvidence = Object.entries(meterReadings).map(([id, val]) => {
                const nozzle = closingData?.nozzles.find(n => n.nozzle_id === id);
                const evidence = meterEvidence[id];
                return {
                    nozzle_id: id,
                    opening_reading: nozzle?.opening_reading || 0,
                    closing_reading: Number(val),
                    ...(evidence ? { evidence } : {}),
                };
            });
            onSubmit({
                meters: metersWithEvidence,
                dips: Object.entries(tankDips).map(([id, val]) => ({
                    tank_id: id,
                    dip_mm: Number(val)
                })),
                payments: {
                    cash: Number(cashAmount) || 0,
                    mpesa: Number(mpesaAmount) || 0,
                    credit: creditSales.length > 0 ? creditSales.map(s => ({
                        customer_id: s.customerId,
                        amount: Number(s.amount),
                        vehicle_reg: s.vehicleReg || null
                    })) : []
                }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const addCreditSale = () => {
        if (!hasCustomers) return;
        const newId = Math.random().toString(36).substr(2, 9);
        setCreditSales([...creditSales, { id: newId, customerId: '', amount: '', vehicleReg: '' }]);
    };

    const removeCreditSale = (id: string) => {
        setCreditSales(creditSales.filter(s => s.id !== id));
    };

    const updateCreditSale = (id: string, field: keyof typeof creditSales[0], value: string) => {
        setCreditSales(creditSales.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const takeMeterPhoto = async (nozzleId: string) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Camera Permission Required',
                'Please grant camera access to capture meter evidence for audit compliance.',
                [{ text: 'OK' }]
            );
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const evidence = {
                uri: asset.uri,
                type: asset.mimeType ?? 'image/jpeg',
                name: asset.fileName ?? `meter-${nozzleId}.jpg`,
            };
            // Defer state update to avoid navigation context race after camera closes
            // (known issue: launchCameraAsync can break navigation context on return from full-screen camera)
            InteractionManager.runAfterInteractions(() => {
                setMeterEvidence(prev => ({ ...prev, [nozzleId]: evidence }));
            });
        }
    };

    const allMetersHaveEvidence = closingData
        ? closingData.nozzles.every(n => !!meterEvidence[n.nozzle_id])
        : false;

    const canProceedFromStep1 = allMetersHaveEvidence;

    if (!visible) return null;

    if (isLoading && !closingData) {
        return (
            <Modal transparent visible={visible} animationType="fade">
                <View className="flex-1 bg-black/60 justify-center items-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </Modal>
        );
    }

    if (!closingData) {
        return (
            <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
                <View className="flex-1 bg-black/60 justify-center items-center p-6">
                    <View className="bg-surface-sunken p-6 rounded-2xl border border-surface-border w-full max-w-sm items-center">
                        <View className="bg-accent-subtle p-4 rounded-full mb-4">
                            <TriangleAlert size={32} color="#bf0a30" />
                        </View>
                        <Text className="text-ink font-bold text-lg mb-2">Failed to Load Data</Text>
                        <Text className="text-ink-muted text-center mb-6 leading-5">
                            Could not fetch closing data for this shift. Please check your connection and try again.
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-surface border border-surface-border px-6 py-3 rounded-xl w-full items-center active:bg-surface-border"
                        >
                            <Text className="text-ink font-bold">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/60">
                <KeyboardAvoidingView
                    behavior="padding"
                    enabled={Platform.OS === 'ios'}
                    className="flex-1 justify-end"
                    keyboardVerticalOffset={0}
                >
                    {/* Backdrop Tap to Close */}
                    <Pressable className="absolute inset-0" onPress={onClose} />

                    <Animated.View
                        entering={SlideInDown.duration(250)}
                        exiting={SlideOutDown}
                        className="bg-surface-sunken h-[92%] rounded-t-3xl border-t border-surface-border w-full flex overflow-hidden"
                    >
                    {/* Header */}
                    <View className="px-6 py-4 border-b border-surface-border flex-row items-center justify-between bg-surface-sunken/90 z-10">
                        <View>
                            <Text className="text-ink text-xl font-bold">End Shift</Text>
                            <Text className="text-ink-muted text-xs font-medium uppercase tracking-wider">
                                Step {step} of 3: {step === 1 ? 'Meter Readings' : step === 2 ? 'Tank Dips' : 'Payments & Reconciliation'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="bg-surface p-2 rounded-full">
                            <X size={20} color="#8b8b99" />
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View className="flex-row h-1 w-full bg-surface">
                        <View className={`h-full bg-blue-500 transition-all duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >

                        {/* -------------------- STEP 1: METERS -------------------- */}
                        {step === 1 && (
                            <Animated.View entering={FadeIn}>
                                <Text className="text-ink mb-6 leading-6">
                                    Enter the closing reading for each pump nozzle and capture a photo of the meter display for audit compliance.
                                </Text>
                                {!canProceedFromStep1 ? (
                                    <View className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                        <Text className="text-amber-700 text-sm">Photo evidence required for each nozzle before proceeding.</Text>
                                    </View>
                                ) : null}
                                {closingData.nozzles.map((nozzle, index) => (
                                    <View key={`${nozzle.nozzle_id}-${index}`} className="mb-6 bg-surface-sunken p-4 rounded-xl border border-surface-border gap-3">
                                        <View className="flex-row justify-between mb-1">
                                            <Text className="text-ink font-bold">{nozzle.pump_name}</Text>
                                            <Text className="text-ink-muted text-xs">Prev: {nozzle.opening_reading}</Text>
                                        </View>
                                        <View className="flex-row items-center bg-surface-sunken border border-surface-border rounded-lg overflow-hidden h-12">
                                            <View className="pl-3 pr-2 h-full justify-center border-r border-surface-border bg-surface/30">
                                                <Gauge size={18} color="#5c5c6b" />
                                            </View>
                                            <TextInput
                                                className="flex-1 text-ink px-3 font-mono text-base h-full"
                                                placeholder="Closing Reading"
                                                placeholderTextColor="#5c5c6b"
                                                keyboardType="numeric"
                                                value={meterReadings[nozzle.nozzle_id]}
                                                onChangeText={(v) => setMeterReadings(p => ({ ...p, [nozzle.nozzle_id]: v }))}
                                            />
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            {meterEvidence[nozzle.nozzle_id] ? (
                                                <>
                                                    <Image
                                                        source={{ uri: meterEvidence[nozzle.nozzle_id].uri }}
                                                        className="w-16 h-16 rounded-lg border border-surface-border"
                                                        resizeMode="cover"
                                                    />
                                                    <Pressable
                                                        onPress={() => takeMeterPhoto(nozzle.nozzle_id)}
                                                        className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-surface-border border border-surface-border"
                                                    >
                                                        <Camera size={16} color="#8b8b99" />
                                                        <Text className="text-ink text-sm font-medium">Retake</Text>
                                                    </Pressable>
                                                </>
                                            ) : (
                                                <Pressable
                                                    onPress={() => takeMeterPhoto(nozzle.nozzle_id)}
                                                    className="flex-row items-center gap-2 px-4 py-3 rounded-lg bg-blue-600/20 border border-blue-500/30"
                                                >
                                                    <Camera size={18} color="#60a5fa" />
                                                    <Text className="text-brand text-sm font-bold">Take Photo</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>
                        )}

                        {/* -------------------- STEP 2: DIPS -------------------- */}
                        {step === 2 && (
                            <Animated.View entering={FadeIn}>
                                <Text className="text-ink mb-6 leading-6">
                                    Record the physical dip levels (in mm) for each underground tank.
                                </Text>
                                {closingData.tanks.map((tank, index) => (
                                    <View key={`${tank.tank_id}-${index}`} className="mb-6 bg-surface-sunken p-4 rounded-xl border border-surface-border">
                                        <Text className="text-ink font-bold mb-3">{tank.tank_name}</Text>
                                        <View className="flex-row items-center bg-surface-sunken border border-surface-border rounded-lg overflow-hidden h-12">
                                            <View className="pl-3 pr-2 h-full justify-center border-r border-surface-border bg-surface/30">
                                                <Ruler size={18} color="#5c5c6b" />
                                            </View>
                                            <TextInput
                                                className="flex-1 text-ink px-3 font-mono text-base h-full"
                                                placeholder="Dip Level (mm)"
                                                placeholderTextColor="#5c5c6b"
                                                keyboardType="numeric"
                                                value={tankDips[tank.tank_id]}
                                                onChangeText={(v) => setTankDips(p => ({ ...p, [tank.tank_id]: v }))}
                                            />
                                            <View className="px-3">
                                                <Text className="text-ink-muted font-medium text-xs">mm</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>
                        )}

                        {/* -------------------- STEP 3: PAYMENTS -------------------- */}
                        {step === 3 && (
                            <Animated.View entering={FadeIn}>
                                <Text className="text-ink mb-6 leading-6">
                                    Consolidate all cash, M-Pesa, and credit sales for this shift.
                                </Text>

                                {/* Cash Section */}
                                <View className="mb-6">
                                    <Text className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-2">Cash Collection</Text>
                                    <View className="flex-row items-center bg-surface border border-surface-border rounded-xl overflow-hidden h-14">
                                        <View className="w-12 h-full justify-center items-center bg-surface-border border-r border-surface-border">
                                            <Text className="text-emerald-700 font-bold text-lg">Sh</Text>
                                        </View>
                                        <TextInput
                                            className="flex-1 text-ink px-4 font-bold text-lg h-full"
                                            placeholder="0.00"
                                            placeholderTextColor="#5c5c6b"
                                            keyboardType="decimal-pad"
                                            value={cashAmount}
                                            onChangeText={setCashAmount}
                                        />
                                    </View>
                                </View>

                                {/* M-Pesa Section */}
                                <View className="mb-8">
                                    <Text className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-2">M-Pesa Total</Text>
                                    <View className="flex-row items-center bg-surface border border-surface-border rounded-xl overflow-hidden h-14">
                                        <View className="w-12 h-full justify-center items-center bg-surface-border border-r border-surface-border">
                                            <Text className="text-emerald-700 font-bold text-lg">Sh</Text>
                                        </View>
                                        <TextInput
                                            className="flex-1 text-ink px-4 font-bold text-lg h-full"
                                            placeholder="0.00"
                                            placeholderTextColor="#5c5c6b"
                                            keyboardType="decimal-pad"
                                            value={mpesaAmount}
                                            onChangeText={setMpesaAmount}
                                        />
                                    </View>
                                </View>

                                {/* Credit Sales Section */}
                                <View className="mb-6">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <Text className="text-ink font-bold text-lg">Credit Sales</Text>
                                        <TouchableOpacity
                                            onPress={addCreditSale}
                                            disabled={!hasCustomers}
                                            className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1 ${hasCustomers ? 'bg-blue-600/20 border-blue-500/30' : 'bg-surface border-surface-border opacity-50'}`}
                                        >
                                            <Plus size={12} color={hasCustomers ? "#60a5fa" : "#8b8b99"} />
                                            <Text className={hasCustomers ? "text-brand text-xs font-bold" : "text-ink-muted text-xs font-bold"}>
                                                {isLoadingCustomers ? 'Loading...' : hasCustomers ? 'Add Entry' : 'No Customers'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {creditSales.length === 0 ? (
                                        <View className="p-6 border-2 border-dashed border-surface-border rounded-xl items-center justify-center">
                                            <Text className="text-ink-muted text-sm">No credit sales recorded</Text>
                                        </View>
                                    ) : (
                                        creditSales.map((sale, index) => (
                                            <Animated.View
                                                entering={FadeIn}
                                                key={sale.id}
                                                className="bg-surface p-4 rounded-xl border border-surface-border mb-3"
                                            >
                                                <View className="flex-row justify-between items-start mb-3">
                                                    <Text className="text-ink-muted text-xs font-bold uppercase">Entry #{index + 1}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => removeCreditSale(sale.id)}
                                                        className="bg-accent-subtle px-2 py-1 rounded border border-accent/20 flex-row items-center gap-1"
                                                    >
                                                        <Trash2 size={12} color="#bf0a30" />
                                                        <Text className="text-accent text-xs font-bold">Remove</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Customer Dropdown */}
                                                <View className="mb-3">
                                                    <Text className="text-ink-muted text-xs mb-1">Customer</Text>
                                                    {isLoadingCustomers ? (
                                                        <ActivityIndicator size="small" color="#3b82f6" />
                                                    ) : (
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                                            {customersList.map(cust => (
                                                                <TouchableOpacity
                                                                    key={cust.id}
                                                                    onPress={() => updateCreditSale(sale.id, 'customerId', cust.id)}
                                                                    className={`px-3 py-2 rounded-lg border ${sale.customerId === cust.id ? 'bg-blue-600 border-blue-500' : 'bg-surface-sunken border-surface-border'}`}
                                                                >
                                                                    <Text className={sale.customerId === cust.id ? 'text-ink font-medium text-xs' : 'text-ink-muted text-xs'}>{cust.name}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    )}
                                                </View>

                                                <View className="flex-row gap-3">
                                                    <View className="flex-1">
                                                        <Text className="text-ink-muted text-xs mb-1">Amount</Text>
                                                        <View className="bg-surface-sunken border border-surface-border rounded-lg px-3 py-2">
                                                            <TextInput
                                                                placeholder="0.00"
                                                                placeholderTextColor="#5c5c6b"
                                                                className="text-ink text-sm"
                                                                keyboardType="decimal-pad"
                                                                value={sale.amount}
                                                                onChangeText={(v) => updateCreditSale(sale.id, 'amount', v)}
                                                            />
                                                        </View>
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-ink-muted text-xs mb-1">Vehicle Reg</Text>
                                                        <View className="bg-surface-sunken border border-surface-border rounded-lg px-3 py-2">
                                                            <TextInput
                                                                placeholder="KAA 123A"
                                                                placeholderTextColor="#5c5c6b"
                                                                className="text-ink text-sm"
                                                                autoCapitalize="characters"
                                                                value={sale.vehicleReg}
                                                                onChangeText={(v) => updateCreditSale(sale.id, 'vehicleReg', v)}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>
                                            </Animated.View>
                                        ))
                                    )}
                                </View>

                            </Animated.View>
                        )}

                    </ScrollView>

                    {/* Footer Actions */}
                    <View className="absolute bottom-0 w-full px-6 py-4 bg-surface-sunken border-t border-surface-border flex-row gap-4">
                        {step > 1 && (
                            <TouchableOpacity
                                onPress={handleBack}
                                className="flex-1 py-4 bg-surface rounded-xl items-center"
                            >
                                <Text className="text-ink font-bold uppercase tracking-wider">Back</Text>
                            </TouchableOpacity>
                        )}

                        {step < 3 ? (
                            <TouchableOpacity
                                onPress={handleNext}
                                disabled={step === 1 && !canProceedFromStep1}
                                className={`flex-[2] py-4 rounded-xl items-center ${step === 1 && !canProceedFromStep1 ? 'bg-surface-border opacity-60' : 'bg-blue-600'}`}
                                style={step === 1 && !canProceedFromStep1 ? undefined : {
                                    shadowColor: '#1e3a8a',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text className="text-ink font-bold uppercase tracking-wider">Next Step</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                className={`flex-[2] py-4 bg-emerald-600 rounded-xl items-center ${isSubmitting ? 'opacity-70' : ''}`}
                                style={{
                                    shadowColor: '#064e3b',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text className="text-ink font-bold uppercase tracking-wider">Submit & Lock Shift</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}
