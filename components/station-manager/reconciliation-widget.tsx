import React, { useState, useEffect } from 'react';
import { AppIcon } from '../app-icon';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export function ReconciliationWidget() {
    const [cash, setCash] = useState('');
    const [mpesa, setMpesa] = useState('');
    const [credit, setCredit] = useState('');

    const totalCollected = (parseFloat(cash) || 0) + (parseFloat(mpesa) || 0) + (parseFloat(credit) || 0);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <View className="bg-surface rounded-2xl p-6 mt-6 border border-surface-border">
            <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest mb-4">
                Shift Collections
            </Text>

            {/* Summary Card */}
            <View className="bg-surface-sunken rounded-xl p-4 mb-6 border border-surface-border">
                <View className="flex-row justify-between mb-4">
                    <Text className="text-ink-muted font-medium">Total Collected</Text>
                    <Text className="text-ink font-bold text-lg">{formatCurrency(totalCollected)}</Text>
                </View>
            </View>

            {/* Inputs */}
            <View className="gap-4">
                <InputRow
                    label="Cash Count"
                    value={cash}
                    onChangeText={setCash}
                    icon="banknote"
                    color="#10b981"
                />
                <InputRow
                    label="M-Pesa Totals"
                    value={mpesa}
                    onChangeText={setMpesa}
                    icon="iphone"
                    color="#040273"
                />
                <InputRow
                    label="Credit Sales"
                    value={credit}
                    onChangeText={setCredit}
                    icon="creditcard"
                    color="#f59e0b"
                />
            </View>
        </View>
    );
}

const InputRow = ({ label, value, onChangeText, icon, color }: any) => (
    <View>
        <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">{label}</Text>
        <View className="relative">
            <View className="absolute left-4 top-4 z-10 opacity-70">
                <AppIcon name={icon as any} size={20} color={color} />
            </View>
            <TextInput
                className="bg-surface-sunken text-ink font-bold text-lg p-4 pl-12 rounded-xl border border-surface-border focus:border-brand focus:bg-surface-sunken/80"
                placeholder="0.00"
                placeholderTextColor="#5c5c6b"
                keyboardType="numeric"
                value={value}
                onChangeText={onChangeText}
            />
        </View>
    </View>
);
