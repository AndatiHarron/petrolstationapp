import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShiftIndex } from '@/features/api/shift/shift';
import type { ShiftIndex200, AuthenticationExceptionResponse } from '@/features/api/model';
import { ActivityFeed } from '../../components/station-manager/activity-feed';
import { CreditSaleModal } from '../../components/station-manager/credit-sale-modal';
import { StationManagerHeader } from '../../components/station-manager/header';
import { StartShiftView } from '../../components/station-manager/start-shift-view';

export default function StationManagerDashboard() {
    const router = useRouter();
    const { data: activeShift, isLoading: isShiftFetchPending } = useShiftIndex({
        query: {
            queryKey: ['activeShift'],
        }
    });

    // Cast to runtime type (unwrapped body) to fix type mismatch with generated hook types
    const actualShiftData = activeShift as unknown as (ShiftIndex200 | AuthenticationExceptionResponse | undefined);
    const shiftResource = (actualShiftData && 'data' in actualShiftData) ? actualShiftData.data : undefined;

    const [creditModalVisible, setCreditModalVisible] = useState(false);

    if (isShiftFetchPending) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text className="text-slate-400 mt-4 font-medium">Loading station data...</Text>
            </View>
        );
    }



    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Navigation */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="flex-row items-center py-2 mb-2"
                    >
                        <SymbolView name={"chevron.left" as any} size={16} tintColor="#94a3b8" />
                        <Text className="text-slate-400 ml-1 font-medium">Back to Roles</Text>
                    </TouchableOpacity>

                    <StationManagerHeader isShiftActive={!!shiftResource} />

                    <StartShiftView activeShift={shiftResource} />

                    <View className={!shiftResource ? "opacity-30 pointer-events-none" : ""}>
                        {/* <QuickActionsHero /> */}
                        <ActivityFeed />
                    </View>
                </ScrollView>
            </SafeAreaView>

            <CreditSaleModal
                visible={creditModalVisible}
                onClose={() => setCreditModalVisible(false)}
            />
        </View>
    );
}
