import React, { useState, useCallback } from 'react';
import { View, Pressable, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { ActivityFeed } from '../../components/station-manager/activity-feed';
import { CreditSaleModal } from '../../components/station-manager/credit-sale-modal';
import { ShiftSection } from '../../components/station-manager/shift-section';
import { ProductsSection } from '../../components/station-manager/products-section';
import { TanksSection } from '../../components/station-manager/tanks-section';
import { CustomersSection } from '../../components/station-manager/customers-section';
import { TutorialTarget } from '@/components/tutorial/tutorial-target';
import { useTutorial } from '@/components/tutorial/use-tutorial';

export default function StationManagerDashboard() {
    const { start } = useTutorial();
    const [creditModalVisible, setCreditModalVisible] = useState(false);
    const [isShiftActive, setIsShiftActive] = useState(false);

    const handleShiftChange = useCallback((active: boolean) => {
        setIsShiftActive(active);
    }, []);

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar style="light" backgroundColor="#0f172a" />
            <SafeAreaView className="flex-1">
                <Animated.ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-row justify-end mt-4">
                        <Pressable
                            onPress={() => start({ force: true })}
                            className="bg-emerald-500 px-4 py-2 rounded-full active:opacity-80"
                        >
                            <Text className="text-white font-black text-xs uppercase tracking-wider">Tutorial</Text>
                        </Pressable>
                    </View>

                    {/* Shift Section with header - fetches its own data */}
                    <TutorialTarget id="manager-shift-section">
                        <ShiftSection onShiftChange={handleShiftChange} />
                    </TutorialTarget>

                    {/* Station Overview Section */}
                    <View className={!isShiftActive ? 'opacity-30' : ''}>
                        <ProductsSection />
                        <TanksSection />
                        <CustomersSection />
                        <TutorialTarget id="manager-activity-feed">
                            <ActivityFeed />
                        </TutorialTarget>
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>

            <CreditSaleModal
                visible={creditModalVisible}
                onClose={() => setCreditModalVisible(false)}
            />
        </View>
    );
}
