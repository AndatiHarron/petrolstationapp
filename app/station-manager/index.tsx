import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFeed } from '../../components/station-manager/activity-feed';
import { CreditSaleModal } from '../../components/station-manager/credit-sale-modal';
import { StationManagerHeader } from '../../components/station-manager/header';
import { StartShiftView } from '../../components/station-manager/start-shift-view';

export default function StationManagerDashboard() {
    const router = useRouter();
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [creditModalVisible, setCreditModalVisible] = useState(false);

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

                    <StationManagerHeader isShiftActive={isShiftActive} />

                    {!isShiftActive && (
                        <StartShiftView onStart={() => setIsShiftActive(true)} />
                    )}

                    {/* Dashboard Content - Always visible but dimmed if inactive */}
                    <View className={!isShiftActive ? "opacity-30 pointer-events-none" : ""}>
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
