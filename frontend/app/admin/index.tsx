import React, { useCallback, useState } from 'react';
import { View, Text, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { AdminHeader } from '../../components/admin/dashboard/header';
import { QuickStats } from '../../components/admin/dashboard/quick-stats';
import { WetStockLevels } from '../../components/admin/dashboard/wet-stock-levels';
import { ProductPrices } from '../../components/admin/dashboard/product-prices';
import { RecentActivity } from '../../components/admin/dashboard/recent-activity';
import { FinancialReports } from '../../components/admin/reports/financial-reports';
import { InventoryReports } from '../../components/admin/reports/inventory-reports';
import { ReportFilterBar } from '../../components/admin/reports/report-filter-bar';
import { CustomerStatementModal } from '../../components/admin/reports/customer-statement-modal';
import { ProductModal } from '../../components/admin/infrastructure/product-modal';
import { TankModal } from '../../components/admin/infrastructure/tank-modal';
import { resolvePeriod, type ReportFilters } from '@/features/reports';
import { useTabBarClearance } from '@/components/glass-tab-bar';
import {
    useProductsDestroy,
    getProductsIndexQueryKey,
} from '@/features/api/product/product';
import { useTanksDestroy, getTanksIndexQueryKey } from '@/features/api/tank/tank';
import type { ProductResource, TankResource } from '@/features/api/model';

export default function AdminDashboard() {
    const tabBarClearance = useTabBarClearance();

    const queryClient = useQueryClient();

    // One filter state for every report on the screen, so period and station
    // move together rather than each card carrying its own controls.
    const [filters, setFilters] = useState<ReportFilters>(() => resolvePeriod('this_month'));
    const [statementFor, setStatementFor] = useState<{ id: string; name: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // The dashboard edits what it shows rather than sending you to Setup to do
    // it: a price change is the most frequent thing an administrator does, and
    // it was three taps and a screen away. The sheets are the same ones Setup
    // uses, so a product created here is created the one way.
    const [productSheet, setProductSheet] = useState<{
        open: boolean;
        product?: ProductResource;
    }>({ open: false });
    const [tankSheet, setTankSheet] = useState<{ open: boolean; tank?: TankResource }>({
        open: false,
    });

    const openStatement = useCallback((customerId: string, customerName: string) => {
        setStatementFor({ id: customerId, name: customerName });
    }, []);

    const productDelete = useProductsDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getProductsIndexQueryKey() });
                setProductSheet({ open: false });
            },
            onError: () => Alert.alert('Error', 'Could not delete that product.'),
        },
    });

    const tankDelete = useTanksDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                setTankSheet({ open: false });
            },
            onError: () => Alert.alert('Error', 'Could not delete that tank.'),
        },
    });

    const confirmDeleteProduct = useCallback(
        (id: string) => {
            Alert.alert(
                'Delete product',
                'Shifts already recorded keep their figures, but this product can no longer be sold. This cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => productDelete.mutate({ product: id }),
                    },
                ]
            );
        },
        [productDelete]
    );

    const confirmDeleteTank = useCallback(
        (id: string) => {
            Alert.alert(
                'Delete tank',
                'Its dip history stays on the shifts that recorded it. This cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => tankDelete.mutate({ tank: id }),
                    },
                ]
            );
        },
        [tankDelete]
    );

    // Pull to refresh the whole page: a dashboard people leave open all day
    // should not need closing and reopening to show today's figures.
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries();
        setRefreshing(false);
    }, [queryClient]);

    return (
        // A tinted ground so the white cards read as cards. On white they had
        // no edge, which is what made the page look like one long list.
        <View className="flex-1 bg-surface-sunken">
            <StatusBar style="dark" backgroundColor="#f7f7fa" />
            <SafeAreaView className="flex-1" edges={['left', 'right']}>
                <Animated.ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        paddingBottom: tabBarClearance,
                        gap: 12,
                    }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#040273"
                            colors={['#040273']}
                        />
                    }
                >
                    <AdminHeader />

                    {/* Sections carry their own card, spacing and entrance
                        stagger; index sets the order they arrive in. */}
                    <QuickStats index={0} />
                    <WetStockLevels
                        index={1}
                        onAdd={() => setTankSheet({ open: true })}
                        onEdit={(tank) => setTankSheet({ open: true, tank })}
                    />
                    <ProductPrices
                        index={2}
                        onAdd={() => setProductSheet({ open: true })}
                        onEdit={(product) => setProductSheet({ open: true, product })}
                    />
                    <RecentActivity index={3} />

                    {/* Everything below is driven by one set of filters. */}
                    <View className="mt-2 gap-1">
                        <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                            Reporting
                        </Text>
                        <ReportFilterBar filters={filters} onChange={setFilters} />
                    </View>

                    <FinancialReports filters={filters} onSelectCustomer={openStatement} />
                    <InventoryReports filters={filters} />
                </Animated.ScrollView>
            </SafeAreaView>

            <CustomerStatementModal
                customerId={statementFor?.id ?? null}
                customerName={statementFor?.name}
                filters={filters}
                onClose={() => setStatementFor(null)}
            />

            <ProductModal
                visible={productSheet.open}
                product={productSheet.product}
                onClose={() => setProductSheet({ open: false })}
                onDelete={confirmDeleteProduct}
            />

            <TankModal
                visible={tankSheet.open}
                tank={tankSheet.tank}
                onClose={() => setTankSheet({ open: false })}
                onDelete={confirmDeleteTank}
            />
        </View>
    );
}
