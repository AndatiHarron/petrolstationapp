import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentShiftTab } from '@/components/station-manager/current-shift-tab';
import { ShiftHistoryTab } from '@/components/station-manager/shift-history-tab';

type TabMode = 'current' | 'history';

export default function ShiftsScreen() {
    const [activeTab, setActiveTab] = useState<TabMode>('current');

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar style="light" backgroundColor="#0f172a" />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 pt-4 pb-2">
                    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                        <Text className="text-white text-2xl font-bold">Shift Management</Text>
                    </Animated.View>
                </View>

                {/* Segmented Control */}
                <View className="px-4 py-3">
                    <View className="flex-row bg-slate-800 rounded-xl p-1">
                        <TouchableOpacity
                            onPress={() => setActiveTab('current')}
                            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'current' ? 'bg-blue-600' : ''}`}
                        >
                            <Text className={`font-semibold text-sm ${activeTab === 'current' ? 'text-white' : 'text-slate-400'}`}>
                                Current Shift
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('history')}
                            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'history' ? 'bg-blue-600' : ''}`}
                        >
                            <Text className={`font-semibold text-sm ${activeTab === 'history' ? 'text-white' : 'text-slate-400'}`}>
                                Shift History
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tab Content */}
                {activeTab === 'current' ? <CurrentShiftTab /> : <ShiftHistoryTab />}
            </SafeAreaView>
        </View>
    );
}
