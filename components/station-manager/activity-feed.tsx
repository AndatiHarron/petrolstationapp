import React from 'react';
import { View, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';

const activities = [
    { id: 1, action: 'Payment Added', detail: 'KES 4,500 (M-Pesa)', time: '10:42 AM', icon: 'iphone', color: '#3b82f6' },
    { id: 2, action: 'Pump Reading', detail: 'Pump 2: 14502.5 L', time: '09:15 AM', icon: 'fuelpump.fill', color: '#10b981' },
    { id: 3, action: 'Credit Sale', detail: 'Logistics Ltd: KES 12,000', time: '08:30 AM', icon: 'doc.text.fill', color: '#f59e0b' },
];

export function ActivityFeed() {
    return (
        <View className="mt-8 mb-10">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                Recent Activity
            </Text>
            <View className="bg-slate-800 rounded-2xl p-2">
                {activities.map((item, index) => (
                    <View
                        key={item.id}
                        className={`flex-row items-center p-4 ${index !== activities.length - 1 ? 'border-b border-slate-700/50' : ''
                            }`}
                    >
                        <View className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center mr-4">
                            <SymbolView name={item.icon as any} size={18} tintColor={item.color} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-base">{item.action}</Text>
                            <Text className="text-slate-400 text-sm">{item.detail}</Text>
                        </View>
                        <Text className="text-slate-500 text-xs font-semibold">{item.time}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
