import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

interface ActionButtonProps {
    label: string;
    icon: string;
    color: string;
    onPress: () => void;
}

const ActionButton = ({ label, icon, color, onPress }: ActionButtonProps) => (
    <TouchableOpacity
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
        }}
        className="bg-slate-800 rounded-xl p-6 mb-4 w-[48%] active:bg-slate-700 active:scale-95 transition-all"
        style={{
            shadowColor: color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4
        }}
    >
        <View
            className="w-12 h-12 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: `${color}20` }}
        >
            <SymbolView
                name={icon as any}
                size={24}
                tintColor={color}
            />
        </View>
        <Text className="text-white font-bold text-lg leading-6">
            {label}
        </Text>
    </TouchableOpacity>
);

export function QuickActionsHero() {
    return (
        <View className="flex-row flex-wrap justify-between mt-4">
            <ActionButton
                label="Log Meter Readings"
                icon="speedometer"
                color="#3b82f6"
                onPress={() => console.log('Log Readings')}
            />
            <ActionButton
                label="Log Tank Dips"
                icon="ruler.fill"
                color="#f59e0b"
                onPress={() => console.log('Log Dips')}
            />
            <ActionButton
                label="Receive Stock"
                icon="cube.box.fill"
                color="#10b981"
                onPress={() => console.log('Receive Stock')}
            />
            <ActionButton
                label="Record Expenses"
                icon="banknote.fill"
                color="#ef4444"
                onPress={() => console.log('Record Expense')}
            />
        </View>
    );
}
