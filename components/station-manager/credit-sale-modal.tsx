import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { BlurView } from 'expo-blur';

interface CreditSaleModalProps {
    visible: boolean;
    onClose: () => void;
}

const CUSTOMERS = [
    'Logistics Ltd',
    'Speedy Transporters',
    'City Construction',
    'Highway Haulers',
    'Metro Bus Sacco'
];

export function CreditSaleModal({ visible, onClose }: CreditSaleModalProps) {
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

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
                    <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700 h-[85%]">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-slate-700 rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-slate-800">
                            <View>
                                <Text className="text-white text-2xl font-bold">New Credit Sale</Text>
                                <Text className="text-slate-400 text-sm">Link purchase to debtor account</Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
                            >
                                <SymbolView name="xmark" size={16} tintColor="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            className="flex-1 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Amount Input */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">Total Amount (KES)</Text>
                            <View className="relative mb-8">
                                <View className="absolute left-4 top-4 z-10">
                                    <Text className="text-slate-500 text-lg font-bold">KES</Text>
                                </View>
                                <TextInput
                                    className="bg-slate-800 text-white font-black text-3xl p-4 pl-16 rounded-xl border border-slate-700 focus:border-blue-500 focus:bg-slate-800/80 h-20"
                                    placeholder="0.00"
                                    placeholderTextColor="#475569"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus
                                />
                            </View>

                            {/* Customer Selection */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">Select Customer</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mb-8"
                                contentContainerStyle={{ paddingRight: 20 }}
                            >
                                {CUSTOMERS.map((customer) => (
                                    <TouchableOpacity
                                        key={customer}
                                        onPress={() => setSelectedCustomer(customer)}
                                        className={`mr-3 px-4 py-3 rounded-xl border ${selectedCustomer === customer
                                                ? 'bg-blue-600 border-blue-500'
                                                : 'bg-slate-800 border-slate-700'
                                            }`}
                                    >
                                        <Text className={`font-bold ${selectedCustomer === customer ? 'text-white' : 'text-slate-400'
                                            }`}>
                                            {customer}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Notes */}
                            <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">Additional Notes</Text>
                            <TextInput
                                className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 focus:bg-slate-800/80 min-h-[100px] mb-8"
                                placeholder="Driver name, vehicle registration..."
                                placeholderTextColor="#475569"
                                multiline
                                textAlignVertical="top"
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </ScrollView>

                        {/* Footer */}
                        <View className="p-6 border-t border-slate-800 bg-slate-900 pb-10">
                            <TouchableOpacity
                                className="bg-blue-600 rounded-xl py-4 items-center shadow-lg shadow-blue-900/20"
                                onPress={onClose} // Functionality would go here
                            >
                                <Text className="text-white font-bold text-lg">Confirm Credit Sale</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
