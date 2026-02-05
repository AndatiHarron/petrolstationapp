import React, { useState, useCallback } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { ActivityFeed } from '../../components/station-manager/activity-feed';
import { CreditSaleModal } from '../../components/station-manager/credit-sale-modal';
import { ShiftSection } from '../../components/station-manager/shift-section';
import { ProductsSection } from '../../components/station-manager/products-section';
import { TanksSection } from '../../components/station-manager/tanks-section';
import { CustomersSection } from '../../components/station-manager/customers-section';

export default function StationManagerDashboard() {
    const [creditModalVisible, setCreditModalVisible] = useState(false);
    const [isShiftActive, setIsShiftActive] = useState(false);

    const handleShiftChange = useCallback((active: boolean) => {
        setIsShiftActive(active);
    }, []);

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                <Animated.ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Shift Section with header - fetches its own data */}
                    <ShiftSection onShiftChange={handleShiftChange} />

                    {/* Station Overview Section */}
                    <View className={!isShiftActive ? 'opacity-30' : ''}>
                        <ProductsSection />
                        <TanksSection />
                        <CustomersSection />
                        <ActivityFeed />
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
