import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAuthStore } from '@/store/useAuthStore';
import { LogoutModal } from '@/components/station-manager/logout-modal';

export function SuperAdminHeader() {
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
                <Text className="text-white text-2xl font-bold mt-1">
                    Overview
                </Text>
                <Text className="text-slate-500 text-sm mt-1">
                    Manage organizations and admins
                </Text>
            </View>

            <View className="flex-row items-center gap-3">
                <Pressable
                    onPress={() => setLogoutModalVisible(true)}
                    className="flex-row items-center bg-slate-800 px-3 py-2 rounded-full border border-slate-700 gap-2 active:bg-slate-700"
                >
                    <SymbolView name="power" size={14} tintColor="#ef4444" />
                    <Text className="text-slate-300 font-bold text-xs uppercase tracking-wider">Log Out</Text>
                </Pressable>
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
