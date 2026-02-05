import { useCustomersIndex } from '@/features/api/customer/customer';
import type { ShiftClosingData200, ShiftResource } from '@/features/api/model';
import { useShiftClosingData } from '@/features/api/shift/shift';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

    // 2. Tank Dips State
    const [tankDips, setTankDips] = useState<Record<string, string>>({});

    // Reset form when activeShift changes
    React.useEffect(() => {
        setStep(1);
        setMeterReadings({});
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

    // Helpers
    const handleNext = () => {
        if (step < 3) setStep(prev => (prev + 1) as any);
    };

    const handleBack = () => {
        if (step > 1) setStep(prev => (prev - 1) as any);
    };

    const handleSubmit = () => {
        // Collect all data
        const data = {
            meters: Object.entries(meterReadings).map(([id, val]) => {
                const nozzle = closingData?.nozzles.find(n => n.nozzle_id === id);
                return {
                    nozzle_id: id,
                    opening_reading: nozzle?.opening_reading || 0,
                    closing_reading: Number(val)
                };
            }),
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
                })) : null
            }
        };
        onSubmit(data);
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
                    <View className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm items-center">
                        <View className="bg-red-500/10 p-4 rounded-full mb-4">
                            <SymbolView name="exclamationmark.triangle.fill" size={32} tintColor="#ef4444" />
                        </View>
                        <Text className="text-white font-bold text-lg mb-2">Failed to Load Data</Text>
                        <Text className="text-slate-400 text-center mb-6 leading-5">
                            Could not fetch closing data for this shift. Please check your connection and try again.
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-slate-800 border border-slate-700 px-6 py-3 rounded-xl w-full items-center active:bg-slate-700"
                        >
                            <Text className="text-white font-bold">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/60 justify-end">
                {/* Backdrop Tap to Close */}
                <Pressable className="absolute inset-0" onPress={onClose} />

                <Animated.View
                    entering={SlideInDown.duration(250)}
                    exiting={SlideOutDown}
                    className="bg-slate-900 h-[92%] rounded-t-3xl border-t border-slate-700 w-full flex overflow-hidden"
                >
                    {/* Header */}
                    <View className="px-6 py-4 border-b border-slate-800 flex-row items-center justify-between bg-slate-900/90 z-10">
                        <View>
                            <Text className="text-white text-xl font-bold">End Shift</Text>
                            <Text className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                                Step {step} of 3: {step === 1 ? 'Meter Readings' : step === 2 ? 'Tank Dips' : 'Payments & Reconciliation'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="bg-slate-800 p-2 rounded-full">
                            <SymbolView name="xmark" size={20} tintColor="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View className="flex-row h-1 w-full bg-slate-800">
                        <View className={`h-full bg-blue-500 transition-all duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
                    </View>

                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>

                        {/* -------------------- STEP 1: METERS -------------------- */}
                        {step === 1 && (
                            <Animated.View entering={FadeIn}>
                                <Text className="text-slate-300 mb-6 leading-6">
                                    Enter the closing reading for each pump nozzle. Ensure accuracy to avoid variances.
                                </Text>
                                {closingData.nozzles.map((nozzle, index) => (
                                    <View key={`${nozzle.nozzle_id}-${index}`} className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                        <View className="flex-row justify-between mb-3">
                                            <Text className="text-slate-200 font-bold">{nozzle.pump_name}</Text>
                                            <Text className="text-slate-400 text-xs">Prev: {nozzle.opening_reading}</Text>
                                        </View>
                                        <View className="flex-row items-center bg-slate-900 Wborder border-slate-700 rounded-lg overflow-hidden h-12">
                                            <View className="pl-3 pr-2 h-full justify-center border-r border-slate-700 bg-slate-800/30">
                                                <SymbolView name="gauge.with.needle" size={18} tintColor="#64748b" />
                                            </View>
                                            <TextInput
                                                className="flex-1 text-white px-3 font-mono text-base h-full"
                                                placeholder="Closing Reading"
                                                placeholderTextColor="#475569"
                                                keyboardType="numeric"
                                                value={meterReadings[nozzle.nozzle_id]}
                                                onChangeText={(v) => setMeterReadings(p => ({ ...p, [nozzle.nozzle_id]: v }))}
                                            />
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>
                        )}

                        {/* -------------------- STEP 2: DIPS -------------------- */}
                        {step === 2 && (
                            <Animated.View entering={FadeIn}>
                                <Text className="text-slate-300 mb-6 leading-6">
                                    Record the physical dip levels (in mm) for each underground tank.
                                </Text>
                                {closingData.tanks.map((tank, index) => (
                                    <View key={`${tank.tank_id}-${index}`} className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                        <Text className="text-slate-200 font-bold mb-3">{tank.tank_name}</Text>
                                        <View className="flex-row items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden h-12">
                                            <View className="pl-3 pr-2 h-full justify-center border-r border-slate-700 bg-slate-800/30">
                                                <SymbolView name="ruler.fill" size={18} tintColor="#64748b" />
                                            </View>
                                            <TextInput
                                                className="flex-1 text-white px-3 font-mono text-base h-full"
                                                placeholder="Dip Level (mm)"
                                                placeholderTextColor="#475569"
                                                keyboardType="numeric"
                                                value={tankDips[tank.tank_id]}
                                                onChangeText={(v) => setTankDips(p => ({ ...p, [tank.tank_id]: v }))}
                                            />
                                            <View className="px-3">
                                                <Text className="text-slate-500 font-medium text-xs">mm</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>
                        )}

                        {/* -------------------- STEP 3: PAYMENTS -------------------- */}
                        {step === 3 && (
                            <Animated.View entering={FadeIn}>
                                <Text className="text-slate-300 mb-6 leading-6">
                                    Consolidate all cash, M-Pesa, and credit sales for this shift.
                                </Text>

                                {/* Cash Section */}
                                <View className="mb-6">
                                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Cash Collection</Text>
                                    <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden h-14">
                                        <View className="w-12 h-full justify-center items-center bg-slate-700/30 border-r border-slate-700">
                                            <Text className="text-emerald-400 font-bold text-lg">Sh</Text>
                                        </View>
                                        <TextInput
                                            className="flex-1 text-white px-4 font-bold text-lg h-full"
                                            placeholder="0.00"
                                            placeholderTextColor="#475569"
                                            keyboardType="decimal-pad"
                                            value={cashAmount}
                                            onChangeText={setCashAmount}
                                        />
                                    </View>
                                </View>

                                {/* M-Pesa Section */}
                                <View className="mb-8">
                                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">M-Pesa Total</Text>
                                    <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden h-14">
                                        <View className="w-12 h-full justify-center items-center bg-slate-700/30 border-r border-slate-700">
                                            <Text className="text-emerald-400 font-bold text-lg">Sh</Text>
                                        </View>
                                        <TextInput
                                            className="flex-1 text-white px-4 font-bold text-lg h-full"
                                            placeholder="0.00"
                                            placeholderTextColor="#475569"
                                            keyboardType="decimal-pad"
                                            value={mpesaAmount}
                                            onChangeText={setMpesaAmount}
                                        />
                                    </View>
                                </View>

                                {/* Credit Sales Section */}
                                <View className="mb-6">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <Text className="text-slate-200 font-bold text-lg">Credit Sales</Text>
                                        <TouchableOpacity
                                            onPress={addCreditSale}
                                            disabled={!hasCustomers}
                                            className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1 ${hasCustomers ? 'bg-blue-600/20 border-blue-500/30' : 'bg-slate-800 border-slate-700 opacity-50'}`}
                                        >
                                            <SymbolView name="plus" size={12} tintColor={hasCustomers ? "#60a5fa" : "#94a3b8"} />
                                            <Text className={hasCustomers ? "text-blue-400 text-xs font-bold" : "text-slate-400 text-xs font-bold"}>
                                                {isLoadingCustomers ? 'Loading...' : hasCustomers ? 'Add Entry' : 'No Customers'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {creditSales.length === 0 ? (
                                        <View className="p-6 border-2 border-dashed border-slate-800 rounded-xl items-center justify-center">
                                            <Text className="text-slate-500 text-sm">No credit sales recorded</Text>
                                        </View>
                                    ) : (
                                        creditSales.map((sale, index) => (
                                            <Animated.View
                                                entering={FadeIn}
                                                key={sale.id}
                                                className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 mb-3"
                                            >
                                                <View className="flex-row justify-between items-start mb-3">
                                                    <Text className="text-slate-400 text-xs font-bold uppercase">Entry #{index + 1}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => removeCreditSale(sale.id)}
                                                        className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex-row items-center gap-1"
                                                    >
                                                        <SymbolView name="trash" size={12} tintColor="#ef4444" />
                                                        <Text className="text-red-400 text-xs font-bold">Remove</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Customer Dropdown */}
                                                <View className="mb-3">
                                                    <Text className="text-slate-500 text-xs mb-1">Customer</Text>
                                                    {isLoadingCustomers ? (
                                                        <ActivityIndicator size="small" color="#3b82f6" />
                                                    ) : (
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                                            {customersList.map(cust => (
                                                                <TouchableOpacity
                                                                    key={cust.id}
                                                                    onPress={() => updateCreditSale(sale.id, 'customerId', cust.id)}
                                                                    className={`px-3 py-2 rounded-lg border ${sale.customerId === cust.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-700'}`}
                                                                >
                                                                    <Text className={sale.customerId === cust.id ? 'text-white font-medium text-xs' : 'text-slate-400 text-xs'}>{cust.name}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    )}
                                                </View>

                                                <View className="flex-row gap-3">
                                                    <View className="flex-1">
                                                        <Text className="text-slate-500 text-xs mb-1">Amount</Text>
                                                        <View className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                                            <TextInput
                                                                placeholder="0.00"
                                                                placeholderTextColor="#475569"
                                                                className="text-white text-sm"
                                                                keyboardType="decimal-pad"
                                                                value={sale.amount}
                                                                onChangeText={(v) => updateCreditSale(sale.id, 'amount', v)}
                                                            />
                                                        </View>
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-slate-500 text-xs mb-1">Vehicle Reg</Text>
                                                        <View className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                                            <TextInput
                                                                placeholder="KAA 123A"
                                                                placeholderTextColor="#475569"
                                                                className="text-white text-sm"
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
                    <View className="absolute bottom-0 w-full px-6 py-4 bg-slate-900 border-t border-slate-800 flex-row gap-4">
                        {step > 1 && (
                            <TouchableOpacity
                                onPress={handleBack}
                                className="flex-1 py-4 bg-slate-800 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold uppercase tracking-wider">Back</Text>
                            </TouchableOpacity>
                        )}

                        {step < 3 ? (
                            <TouchableOpacity
                                onPress={handleNext}
                                className="flex-[2] py-4 bg-blue-600 rounded-xl items-center shadow-lg shadow-blue-900/40"
                            >
                                <Text className="text-white font-bold uppercase tracking-wider">Next Step</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleSubmit}
                                className="flex-[2] py-4 bg-emerald-600 rounded-xl items-center shadow-lg shadow-emerald-900/40"
                            >
                                <Text className="text-white font-bold uppercase tracking-wider">Submit & Lock Shift</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}
