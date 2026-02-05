import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';

export function ReconciliationWidget() {
    const [cash, setCash] = useState('');
    const [mpesa, setMpesa] = useState('');
    const [credit, setCredit] = useState('');

    const expectedRevenue = 145000; // Mocked expected value from pumps

    const totalCollected = (parseFloat(cash) || 0) + (parseFloat(mpesa) || 0) + (parseFloat(credit) || 0);
    const difference = totalCollected - expectedRevenue;
    const isShort = difference < 0;
    const isOver = difference > 0;

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <View className="bg-slate-800 rounded-2xl p-6 mt-6 border border-slate-700">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                Shift Balancing
            </Text>

            {/* Summary Card */}
            <View className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-700/50">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-400 font-medium">Expected Revenue</Text>
                    <Text className="text-slate-200 font-bold">{formatCurrency(expectedRevenue)}</Text>
                </View>
                <View className="flex-row justify-between mb-4">
                    <Text className="text-slate-400 font-medium">Total Collected</Text>
                    <Text className="text-white font-bold text-lg">{formatCurrency(totalCollected)}</Text>
                </View>

                <View className={`p-3 rounded-lg flex-row items-center justify-between ${difference === 0 ? 'bg-emerald-500/10 border border-emerald-500/30' :
                    isShort ? 'bg-red-500/10 border border-red-500/30' :
                        'bg-amber-500/10 border border-amber-500/30'
                    }`}>
                    <Text className={`font-bold ${difference === 0 ? 'text-emerald-400' :
                        isShort ? 'text-red-400' :
                            'text-amber-400'
                        }`}>
                        {difference === 0 ? 'Balanced' : isShort ? 'Shortage' : 'Overage'}
                    </Text>
                    <Text className={`font-black text-lg ${difference === 0 ? 'text-emerald-400' :
                        isShort ? 'text-red-400' :
                            'text-amber-400'
                        }`}>
                        {formatCurrency(Math.abs(difference))}
                    </Text>
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
                    color="#3b82f6"
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
        <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">{label}</Text>
        <View className="relative">
            <View className="absolute left-4 top-4 z-10 opacity-70">
                <SymbolView name={icon as any} size={20} tintColor={color} />
            </View>
            <TextInput
                className="bg-slate-900 text-white font-bold text-lg p-4 pl-12 rounded-xl border border-slate-700 focus:border-blue-500 focus:bg-slate-900/80"
                placeholder="0.00"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={value}
                onChangeText={onChangeText}
            />
        </View>
    </View>
);
