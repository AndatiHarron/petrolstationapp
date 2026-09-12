import React, { useState } from 'react';
import { X } from 'lucide-react-native';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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

    if (!visible) return null;

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
                    <View className="bg-surface-sunken rounded-t-3xl border-t border-surface-border h-[85%]">
                        {/* Handle Bar */}
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-surface-border rounded-full" />
                        </View>

                        {/* Header */}
                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-surface-border">
                            <View>
                                <Text className="text-ink text-2xl font-bold">New Credit Sale</Text>
                                <Text className="text-ink-muted text-sm">Link purchase to debtor account</Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-surface items-center justify-center"
                            >
                                <X size={16} color="#8b8b99" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            className="flex-1 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Amount Input */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">Total Amount (KES)</Text>
                            <View className="relative mb-8">
                                <View className="absolute left-4 top-4 z-10">
                                    <Text className="text-ink-muted text-lg font-bold">KES</Text>
                                </View>
                                <TextInput
                                    className="bg-surface text-ink font-black text-3xl p-4 pl-16 rounded-xl border border-surface-border focus:border-brand focus:bg-surface h-20"
                                    placeholder="0.00"
                                    placeholderTextColor="#5c5c6b"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus
                                />
                            </View>

                            {/* Customer Selection */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">Select Customer</Text>
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
                                                ? 'bg-brand border-brand'
                                                : 'bg-surface border-surface-border'
                                            }`}
                                    >
                                        <Text className={`font-bold ${selectedCustomer === customer ? 'text-white' : 'text-ink-muted'
                                            }`}>
                                            {customer}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Notes */}
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">Additional Notes</Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-brand focus:bg-surface min-h-[100px] mb-8"
                                placeholder="Driver name, vehicle registration..."
                                placeholderTextColor="#5c5c6b"
                                multiline
                                textAlignVertical="top"
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </ScrollView>

                        {/* Footer */}
                        <View className="p-6 border-t border-surface-border bg-surface-sunken pb-10">
                            <TouchableOpacity
                                className="h-12 items-center justify-center rounded-xl bg-brand active:opacity-85"
                                onPress={onClose} // Functionality would go here
                            >
                                <Text className="text-sm font-bold text-white">Confirm Credit Sale</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
