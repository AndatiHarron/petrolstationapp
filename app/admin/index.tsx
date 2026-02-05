import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import Animated from 'react-native-reanimated';
import { AdminHeader } from '../../components/admin/dashboard/header';
import { QuickStats } from '../../components/admin/dashboard/quick-stats';
import { WetStockLevels } from '../../components/admin/dashboard/wet-stock-levels';
import { ProductPrices } from '../../components/admin/dashboard/product-prices';
import { RecentActivity } from '../../components/admin/dashboard/recent-activity';

export default function AdminDashboard() {
    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                <Animated.ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="mb-6 mt-4">
                        <AdminHeader />
                    </View>

                    {/* Quick Stats Row */}
                    <QuickStats />

                    {/* Wet Stock Section */}
                    <WetStockLevels />

                    {/* Products Overview */}
                    <ProductPrices />

                    {/* Recent Activity */}
                    <RecentActivity />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}
