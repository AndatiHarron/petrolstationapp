import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { DashboardLayout } from '../../components/super-admin/dashboard-layout';
import { StatsRibbon } from '../../components/super-admin/stats-ribbon';
import { TenantTable } from '../../components/super-admin/tenant-table';
import { AlertsPanel } from '../../components/super-admin/alerts-panel';
import { MOCK_METRICS, MOCK_TENANTS, MOCK_ALERTS } from '../../components/super-admin/mock-data';
import { Stack } from 'expo-router';

export default function SuperAdminDashboard() {
    return (
        <DashboardLayout>
            {/* <Stack.Screen options={{ title: 'Super Admin', headerShown: false }} /> */}

            <View className="flex-1 flex-row">
                {/* Main Content Area */}
                <View className="flex-1 p-8 bg-slate-900">
                    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        <View className="mb-2">
                            <Text className="text-3xl font-black text-white tracking-tight mb-6">Overview</Text>
                        </View>

                        <StatsRibbon metrics={MOCK_METRICS} />

                        <View className="mt-4 flex-1">
                            <TenantTable data={MOCK_TENANTS} />
                        </View>
                    </ScrollView>
                </View>

                {/* Right Panel - Alerts (Visible on XL screens) */}
                <AlertsPanel alerts={MOCK_ALERTS} />
            </View>
        </DashboardLayout>
    );
}
