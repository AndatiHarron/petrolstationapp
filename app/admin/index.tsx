import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { AdminLayout } from '../../components/admin/admin-layout';
import { FinancialSection } from '../../components/admin/financial-section';
import { InventorySection } from '../../components/admin/inventory-section';
import { ActionSection } from '../../components/admin/action-section';
import { DatePickerDisplay } from '../../components/admin/date-picker';

export default function AdminDashboard() {
    return (
        <AdminLayout>
            <Stack.Screen options={{ title: 'Owner Admin', headerShown: false }} />

            <ScrollView className="flex-1 bg-slate-900 p-8">
                <View className="flex-row flex-wrap justify-between items-start md:items-center mb-8 gap-4">
                    <View className="shrink-0">
                        <Text className="text-3xl font-black text-white tracking-tight">Business Intelligence</Text>
                        <Text className="text-slate-500 text-sm mt-1">Financial oversight and operational integrity.</Text>
                    </View>
                    <DatePickerDisplay />
                </View>

                <FinancialSection />
                <InventorySection />
                <ActionSection />

                {/* Bottom padding for scroll */}
                <View className="h-20" />
            </ScrollView>
        </AdminLayout>
    );
}
