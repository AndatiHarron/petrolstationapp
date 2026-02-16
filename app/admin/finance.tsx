import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { CreditSalesList } from '@/components/admin/finance/credit-sales-list';
import { ShiftsList } from '@/components/admin/finance/shifts-list';
import { CreditorsList } from '@/components/admin/finance/creditors-list';
import { CreditSaleDetailModal } from '@/components/admin/finance/credit-sale-detail-modal';
import { ShiftDetailModal } from '@/components/admin/finance/shift-detail-modal';

export default function FinanceTab() {
    const [selectedCreditSaleId, setSelectedCreditSaleId] = useState<string | null>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

    const handleCreditSalePress = useCallback((creditSaleId: string) => {
        setSelectedCreditSaleId(creditSaleId);
    }, []);

    const handleShiftPress = useCallback((shiftId: string) => {
        setSelectedShiftId(shiftId);
    }, []);

    const handleCloseCreditSaleModal = useCallback(() => {
        setSelectedCreditSaleId(null);
    }, []);

    const handleCloseShiftModal = useCallback(() => {
        setSelectedShiftId(null);
    }, []);

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6 mt-4">
                        <Text className="text-2xl font-bold text-white">Finance</Text>
                        <Text className="text-slate-500 text-sm mt-1">Financial reporting and analysis</Text>
                    </View>

                    <CreditorsList />
                    <CreditSalesList onItemPress={handleCreditSalePress} />
                    <ShiftsList onItemPress={handleShiftPress} />
                </ScrollView>
            </SafeAreaView>

            {/* Modals */}
            <CreditSaleDetailModal
                creditSaleId={selectedCreditSaleId}
                onClose={handleCloseCreditSaleModal}
            />
            <ShiftDetailModal
                shiftId={selectedShiftId}
                onClose={handleCloseShiftModal}
            />
        </View>
    );
}
