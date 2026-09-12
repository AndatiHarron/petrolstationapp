import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import { AdminHeader } from '../../components/admin/dashboard/header';
import { QuickStats } from '../../components/admin/dashboard/quick-stats';
import { WetStockLevels } from '../../components/admin/dashboard/wet-stock-levels';
import { ProductPrices } from '../../components/admin/dashboard/product-prices';
import { RecentActivity } from '../../components/admin/dashboard/recent-activity';
import { FinancialReports } from '../../components/admin/reports/financial-reports';
import { InventoryReports } from '../../components/admin/reports/inventory-reports';
import { ReportFilterBar } from '../../components/admin/reports/report-filter-bar';
import { CustomerStatementModal } from '../../components/admin/reports/customer-statement-modal';
import { resolvePeriod, type ReportFilters } from '@/features/reports';

export default function AdminDashboard() {
    // One filter state for every report on the screen, so period and station
    // move together rather than each card carrying its own controls.
    const [filters, setFilters] = useState<ReportFilters>(() => resolvePeriod('this_month'));
    const [statementFor, setStatementFor] = useState<{ id: string; name: string } | null>(null);

    const openStatement = useCallback((customerId: string, customerName: string) => {
        setStatementFor({ id: customerId, name: customerName });
    }, []);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['left', 'right']}>
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

                    {/* Report filters apply to every report below this point */}
                    <View className="mt-6">
                        <ReportFilterBar filters={filters} onChange={setFilters} />
                    </View>

                    {/* Financial Reports */}
                    <FinancialReports filters={filters} onSelectCustomer={openStatement} />

                    {/* Inventory Reports */}
                    <InventoryReports filters={filters} />
                </Animated.ScrollView>
            </SafeAreaView>

            <CustomerStatementModal
                customerId={statementFor?.id ?? null}
                customerName={statementFor?.name}
                filters={filters}
                onClose={() => setStatementFor(null)}
            />
        </View>
    );
}
