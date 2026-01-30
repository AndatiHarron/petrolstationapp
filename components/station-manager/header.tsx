import React from 'react';
import { View, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';

interface StationManagerHeaderProps {
    isShiftActive?: boolean;
}

export function StationManagerHeader({ isShiftActive = false }: StationManagerHeaderProps) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <View className="flex-row items-center justify-between pb-6 pt-2">
            <View>
                <Text className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                    {currentDate}
                </Text>
                <Text className="text-white text-2xl font-bold mt-1">
                    {isShiftActive ? 'Shift ID: #1234' : 'Overview'}
                </Text>
            </View>

            {isShiftActive ? (
                <View className="bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/50 flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Text className="text-emerald-400 font-bold text-xs uppercase tracking-widest">
                        SHIFT OPEN
                    </Text>
                </View>
            ) : (
                <View className="bg-slate-700/50 px-4 py-2 rounded-full border border-slate-600 flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-slate-500" />
                    <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                        OFF SHIFT
                    </Text>
                </View>
            )}
        </View>
    );
}
