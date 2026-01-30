import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

interface StartShiftViewProps {
    onStart: () => void;
}

export function StartShiftView({ onStart }: StartShiftViewProps) {
    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onStart();
    };

    return (
        <View className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700 w-full items-center shadow-lg shadow-blue-900/10">
            <View
                className="bg-blue-900/30 p-6 rounded-full mb-6 border border-blue-500/20"
            >
                <SymbolView name={"building.2.fill" as any} size={48} tintColor="#60a5fa" />
            </View>

            <Text className="text-white text-2xl font-black uppercase tracking-tight text-center mb-2">
                No Active Shift
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6 font-medium max-w-[250px] leading-5">
                Start a new shift to begin logging transactions and readings.
            </Text>

            <TouchableOpacity
                onPress={handleStart}
                className="w-full bg-blue-600 py-4 rounded-xl items-center active:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/20"
            >
                <Text className="text-white text-lg font-bold uppercase tracking-wider">
                    Start New Shift
                </Text>
            </TouchableOpacity>
        </View>
    );
}
