import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFeed } from '../../components/station-manager/activity-feed';
import { CreditSaleModal } from '../../components/station-manager/credit-sale-modal';
import { CustomersSection } from '../../components/station-manager/customers-section';
import { ProductsSection } from '../../components/station-manager/products-section';
import { ShiftSection } from '../../components/station-manager/shift-section';
import { TanksSection } from '../../components/station-manager/tanks-section';

export default function StationManagerDashboard() {
    const [creditModalVisible, setCreditModalVisible] = useState(false);
    const [isShiftActive, setIsShiftActive] = useState(false);

    const handleShiftChange = useCallback((active: boolean) => {
        setIsShiftActive(active);
    }, []);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Shift Section with header - fetches its own data */}
                        <ShiftSection onShiftChange={handleShiftChange} />

                    {/* Station Overview Section */}
                    <View style={{ opacity: isShiftActive ? 1 : 0.3 }}>
                        <ProductsSection />
                        <TanksSection />
                        <CustomersSection />
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
