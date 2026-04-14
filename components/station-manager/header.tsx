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
                {!isShiftActive && (
                    <Text className="text-white text-2xl font-bold mt-1">
                        Overview
                    </Text>
                )}
            </View>

            <View className="flex-row items-center gap-3">
                <View
                    className="px-4 py-2 rounded-full flex-row items-center gap-2"
                    style={{
                        backgroundColor: isShiftActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                        borderWidth: 1,
                        borderColor: isShiftActive ? 'rgba(16, 185, 129, 0.5)' : '#475569',
                    }}
                >
                    <View
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isShiftActive ? '#10b981' : '#64748b' }}
                    />
                    <Text
                        className="font-bold text-xs uppercase tracking-widest"
                        style={{ color: isShiftActive ? '#34d399' : '#94a3b8' }}
                    >
                        {isShiftActive ? 'SHIFT OPEN' : 'OFF SHIFT'}
                    </Text>
                </View>

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
