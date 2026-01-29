import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar } from 'lucide-react-native';

export function DatePickerDisplay() {
    return (
        <Pressable className="flex-row items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <Calendar size={16} color="#94a3b8" />
            <Text className="text-slate-300 text-sm font-medium ml-2">This Month</Text>
            <View className="ml-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-500" />
        </Pressable>
    );
}
