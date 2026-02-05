import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAuthStore } from '@/store/useAuthStore';
import { LogoutModal } from './logout-modal';

interface StationManagerHeaderProps {
    isShiftActive?: boolean;
}

export function StationManagerHeader({ isShiftActive = false }: StationManagerHeaderProps) {
    const logout = useAuthStore((state) => state.logout);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
                {!isShiftActive && <Text className="text-white text-2xl font-bold mt-1">
                    Overview
                </Text>}
            </View>

            <View className="flex-row items-center gap-3">
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

                <TouchableOpacity
                    onPress={() => setLogoutModalVisible(true)}
                    className="flex-row items-center bg-slate-800 px-3 py-2 rounded-full border border-slate-700 gap-2 active:bg-slate-700"
                >
                    <SymbolView name="power" size={14} tintColor="#ef4444" />
                    <Text className="text-slate-300 font-bold text-xs uppercase tracking-wider">Log Out</Text>
                </TouchableOpacity>
            </View>

            <LogoutModal
                visible={logoutModalVisible}
                onClose={() => setLogoutModalVisible(false)}
                onConfirm={() => {
                    setLogoutModalVisible(false);
                    logout();
                }}
            />
        </View>
    );
}
