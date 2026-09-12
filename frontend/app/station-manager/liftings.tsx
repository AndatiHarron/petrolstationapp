import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Ionicons } from '@expo/vector-icons';
import { useLiftingsStore, useLiftingsDestroy, getLiftingsIndexQueryKey } from '../../features/api/lifting/lifting';
import { useGetV1User } from '../../features/api/default/default';
import { useTanksIndex, getTanksIndexQueryKey } from '../../features/api/tank/tank';
import { useCreditorsIndex } from '../../features/api/creditor/creditor';
import { getAuditLogIndexQueryKey } from '../../features/api/audit-log/audit-log';
import {
    getReportPlQueryKey,
    getReportTaxSummaryQueryKey,
    getReportDebtAgingQueryKey,
    getReportVarianceTrendQueryKey,
} from '../../features/api/report/report';
import { LiftingsIndex200, StoreLiftingRequest, LiftingResource, TanksIndex200, LiftingsIndex200Meta, LiftingsIndex200Links, CreditorsIndex200, SupplierResource } from '../../features/api/model';
import { InputField } from '../../components/input-field';
import { Button } from '../../components/button';
import { PaginationControls } from '../../components/pagination-controls';
import { SkeletonCard } from '../../components/station-manager/skeleton-card';
import { api } from '../../lib/axios';

// Utility to format date as YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0];

// Custom fetch function for paginated liftings
const fetchLiftings = async (page: number): Promise<LiftingsIndex200> => {
    const response = await api.get<LiftingsIndex200>('/v1/liftings', {
        params: { page },
    });
    return response.data;
};

// Separate component for list item
const LiftingItem = ({ item, onPress }: { item: LiftingResource; onPress: (item: LiftingResource) => void }) => {
    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="bg-surface p-4 rounded-xl mb-3 border border-surface-border"
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-ink text-lg font-bold">{item.tank_name}</Text>
                    <Text className="text-ink-muted text-sm">{item.product_name}</Text>
                </View>
                <View className="items-end gap-1">
                    <View className="bg-emerald-50 px-3 py-1 rounded-full">
                        <Text className="text-emerald-700 font-bold text-sm">{item.volume_liters.toLocaleString()} L</Text>
                    </View>
                    {item.is_credit ? (
                        <View className="bg-amber-50 px-2 py-0.5 rounded-full">
                            <Text className="text-amber-700 text-xs font-bold">Credit</Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <View className="flex-row justify-between items-center mt-2">
                <View>
                    <Text className="text-ink-muted text-xs">{new Date(item.lifting_date).toLocaleDateString()}</Text>
                    {item.supplier?.name ? (
                        <Text className="text-sky-400 text-xs mt-0.5">{item.supplier?.name}</Text>
                    ) : null}
                </View>
                <Text className="text-ink font-mono text-sm">KES {item.total_cost.toLocaleString()}</Text>
            </View>
            {item.invoice_number ? (
                <Text className="text-ink-faint text-xs mt-1">Inv: {item.invoice_number}</Text>
            ) : null}
        </TouchableOpacity>
    );
};

export default function LiftingsScreen() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    // Use custom paginated query
    const { data: liftingsData, isLoading, isFetching, refetch, error } = useQuery({
        queryKey: [...getLiftingsIndexQueryKey(), { page }],
        queryFn: () => fetchLiftings(page),
    });

    const { data: userData } = useGetV1User();
    const { data: tanksData, isLoading: isLoadingTanks } = useTanksIndex();
    const { data: creditorsData, isLoading: isLoadingCreditors } = useCreditorsIndex();

    const [refreshing, setRefreshing] = useState(false);

    // Extract pagination info
    const meta: LiftingsIndex200Meta | undefined = liftingsData?.meta;
    const links: LiftingsIndex200Links | undefined = liftingsData?.links;
    const liftingsList = liftingsData?.data ?? [];

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newItem, setNewItem] = useState<Partial<StoreLiftingRequest>>({
        lifting_date: formatDate(new Date()),
        invoice_number: '',
        volume_liters: 0,
        buying_price_per_liter: 0,
        total_cost: 0,
        tax_paid: 0,
        is_credit: false,
    });
    const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

    // Details Modal State
    const [selectedLifting, setSelectedLifting] = useState<LiftingResource | null>(null);

    // Get user's station ID
    const userProfile = useMemo(() => {
        if (!userData) return null;
        const res = userData as unknown as { data?: { station_id?: string | null; station_name?: string | null } };
        return res?.data;
    }, [userData]);

    // Get tanks list
    const tanks = useMemo(() => {
        if (!tanksData) return [];
        const res = tanksData as unknown as TanksIndex200;
        return res?.data || [];
    }, [tanksData]);

    // Get creditors list
    const creditors: SupplierResource[] = useMemo(() => {
        if (!creditorsData) return [];
        const res = creditorsData as unknown as CreditorsIndex200;
        return res?.data ?? [];
    }, [creditorsData]);

    const createMutation = useLiftingsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getLiftingsIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportPlQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportTaxSummaryQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportDebtAgingQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportVarianceTrendQueryKey() });
                setIsCreateModalOpen(false);
                resetForm();
                Alert.alert("Success", "Lifting recorded successfully.");
            },
            onError: (error: any) => {
                Alert.alert("Error", error?.response?.data?.message || "Failed to record lifting.");
            }
        }
    });

    const deleteMutation = useLiftingsDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getLiftingsIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportPlQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportTaxSummaryQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportDebtAgingQueryKey() });
                queryClient.invalidateQueries({ queryKey: getReportVarianceTrendQueryKey() });
                setSelectedLifting(null);
                Alert.alert("Success", "Lifting deleted successfully.");
            },
            onError: (error: any) => {
                Alert.alert("Error", error?.response?.data?.message || "Failed to delete lifting.");
            }
        }
    });

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    // Move hooks before any conditional returns to satisfy Rules of Hooks
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Auto-calculate total cost and tax
    const handleVolumeOrPriceChange = (field: 'volume_liters' | 'buying_price_per_liter', value: string) => {
        const numValue = parseFloat(value) || 0;
        const updated = { ...newItem, [field]: numValue };
        const vol = field === 'volume_liters' ? numValue : (newItem.volume_liters || 0);
        const price = field === 'buying_price_per_liter' ? numValue : (newItem.buying_price_per_liter || 0);
        const totalCost = vol * price;
        updated.total_cost = totalCost;

        // Calculate tax based on selected tank's VAT rate
        const selectedTank = tanks.find(t => t.id === selectedTankId);
        const vatRate = selectedTank?.product_vat_rate || 0;
        updated.tax_paid = totalCost * (vatRate);

        setNewItem(updated);
    };

    // Handle tank selection change and recalculate tax
    const handleTankChange = (tankId: string) => {
        setSelectedTankId(tankId);

        // Recalculate tax with new tank's VAT rate
        const selectedTank = tanks.find(t => t.id === tankId);
        const vatRate = selectedTank?.product_vat_rate || 0;
        const totalCost = newItem.total_cost || 0;
        setNewItem(prev => ({
            ...prev,
            tax_paid: totalCost * (vatRate / 100)
        }));
    };

    const resetForm = () => {
        setNewItem({
            lifting_date: formatDate(new Date()),
            invoice_number: '',
            volume_liters: 0,
            buying_price_per_liter: 0,
            total_cost: 0,
            tax_paid: 0,
            is_credit: false,
        });
        setSelectedTankId(null);
        setSelectedSupplierId(null);
    };

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <Text className="text-ink text-lg font-bold">Error fetching liftings: {(error as Error).message}</Text>
            </View>
        );
    }

    const handleLiftingPress = (lifting: LiftingResource) => {
        setSelectedLifting(lifting);
    };

    const handleAddPress = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = () => {
        if (!selectedTankId || !userProfile?.station_id) {
            Alert.alert("Validation Error", "Station and Tank are required.");
            return;
        }
        if (!newItem.lifting_date || !newItem.volume_liters || newItem.volume_liters <= 0) {
            Alert.alert("Validation Error", "Date and Volume are required.");
            return;
        }
        if (!newItem.buying_price_per_liter || newItem.buying_price_per_liter <= 0) {
            Alert.alert("Validation Error", "Buying price is required.");
            return;
        }

        const payload: StoreLiftingRequest = {
            station_id: userProfile.station_id,
            tank_id: selectedTankId,
            lifting_date: newItem.lifting_date,
            invoice_number: newItem.invoice_number || null,
            volume_liters: newItem.volume_liters,
            buying_price_per_liter: newItem.buying_price_per_liter,
            total_cost: newItem.total_cost || (newItem.volume_liters * newItem.buying_price_per_liter),
            tax_paid: newItem.tax_paid || null,
            supplier_id: selectedSupplierId || undefined,
            is_credit: newItem.is_credit || false,
        };
        createMutation.mutate({ data: payload });
    };

    const handleDeletePress = () => {
        if (!selectedLifting?.id) return;

        Alert.alert(
            "Delete Lifting",
            `Are you sure you want to delete this lifting record? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate({ lifting: selectedLifting.id })
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-200 bg-white">
                <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-bold text-ink">Liftings</Text>
                    {meta && (
                        <View className="bg-brand-subtle px-2 py-0.5 rounded-full">
                            <Text className="text-brand text-xs font-bold">{meta.total}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={handleAddPress}>
                    <Ionicons name="add-circle" size={32} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 px-4 pt-4">
                {isLoading ? (
                    <View>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <View key={i} className="mb-3 w-full">
                                <SkeletonCard variant="lifting" />
                            </View>
                        ))}
                    </View>
                ) : (
                    <FlashList
                        data={liftingsList}
                        renderItem={({ item }) => (
                            <LiftingItem item={item} onPress={handleLiftingPress} />
                        )}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                        }
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center p-10">
                                <Text className="text-ink-muted text-center">No liftings found.</Text>
                                <Text className="text-ink-faint text-center text-sm mt-2">Tap + to record a new fuel delivery.</Text>
                            </View>
                        )}
                        ListFooterComponent={() => (
                            meta && meta.last_page > 1 ? (
                                <PaginationControls
                                    currentPage={meta.current_page}
                                    lastPage={meta.last_page}
                                    onPageChange={handlePageChange}
                                    loading={isFetching}
                                    hasPrev={!!links?.prev}
                                    hasNext={!!links?.next}
                                />
                            ) : null
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>

            {/* Create Lifting Modal */}
            <Modal
                visible={isCreateModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCreateModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior="padding"
                    enabled={Platform.OS === 'ios'}
                    className="flex-1 justify-end"
                    keyboardVerticalOffset={0}
                >
                    <View className="bg-surface-sunken border-t border-surface-border h-[90%] rounded-t-3xl shadow-2xl">
                        <View className="p-6 border-b border-surface-border flex-row justify-between items-center bg-surface-sunken rounded-t-3xl">
                            <Text className="text-xl font-bold text-ink">New Lifting</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                <Ionicons name="close-circle" size={28} color="#5c5c6b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            className="flex-1 p-6"
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Station (Read-only) */}
                            <View className="mb-4">
                                <Text className="text-ink-muted text-sm font-medium mb-1">Station</Text>
                                <View className="bg-surface border border-surface-border rounded-xl p-4">
                                    <Text className="text-ink">{userProfile?.station_name || 'N/A'}</Text>
                                </View>
                            </View>

                            {/* Tank Selector */}
                            <View className="mb-4">
                                <Text className="text-ink-muted text-sm font-medium mb-2">Tank *</Text>
                                {isLoadingTanks ? (
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                ) : tanks.length === 0 ? (
                                    <View className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4">
                                        <Text className="text-amber-700 text-sm">No tanks found.</Text>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        {tanks.map((tank) => (
                                            <TouchableOpacity
                                                key={tank.id}
                                                onPress={() => handleTankChange(tank.id)}
                                                className={`px-4 py-3 rounded-xl border mr-2 ${selectedTankId === tank.id ? 'bg-blue-600 border-blue-500' : 'bg-surface border-surface-border'}`}
                                            >
                                                <Text className={selectedTankId === tank.id ? 'text-ink font-bold' : 'text-ink'}>{tank.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>

                            <InputField
                                label="Lifting Date *"
                                placeholder="YYYY-MM-DD"
                                value={newItem.lifting_date || ''}
                                onChangeText={(text) => setNewItem({ ...newItem, lifting_date: text })}
                            />

                            <InputField
                                label="Invoice Number"
                                placeholder="INV-12345"
                                value={newItem.invoice_number || ''}
                                onChangeText={(text) => setNewItem({ ...newItem, invoice_number: text })}
                            />

                            <InputField
                                label="Volume (Liters) *"
                                placeholder="0"
                                keyboardType="numeric"
                                value={newItem.volume_liters?.toString() || ''}
                                onChangeText={(text) => handleVolumeOrPriceChange('volume_liters', text)}
                            />

                            <InputField
                                label="Buying Price per Liter *"
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={newItem.buying_price_per_liter?.toString() || ''}
                                onChangeText={(text) => handleVolumeOrPriceChange('buying_price_per_liter', text)}
                            />

                            <View className="mb-4">
                                <Text className="text-ink-muted text-sm font-medium mb-1">Total Cost (Auto-calculated)</Text>
                                <View className="bg-surface border border-surface-border rounded-xl p-4">
                                    <Text className="text-emerald-700 font-mono font-bold text-lg">
                                        KES {(newItem.total_cost || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            <View className="mb-4">
                                <Text className="text-ink-muted text-sm font-medium mb-1">Tax Paid (Auto-calculated)</Text>
                                <View className="bg-surface border border-surface-border rounded-xl p-4">
                                    <Text className="text-orange-400 font-mono font-bold text-lg">
                                        KES {(newItem.tax_paid || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            {/* Supplier Selector */}
                            <View className="mb-4">
                                <Text className="text-ink-muted text-sm font-medium mb-2">Supplier (Optional)</Text>
                                {isLoadingCreditors ? (
                                    <ActivityIndicator size="small" color="#38bdf8" />
                                ) : creditors.length === 0 ? (
                                    <View className="bg-surface border border-surface-border rounded-xl p-4">
                                        <Text className="text-ink-muted text-sm">No suppliers found. Add one in Admin {'>'} Infrastructure.</Text>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        <TouchableOpacity
                                            onPress={() => setSelectedSupplierId(null)}
                                            className={`px-4 py-3 rounded-xl border mr-2 ${selectedSupplierId === null ? 'bg-slate-600 border-slate-500' : 'bg-surface border-surface-border'}`}
                                        >
                                            <Text className={selectedSupplierId === null ? 'text-ink font-bold' : 'text-ink'}>None</Text>
                                        </TouchableOpacity>
                                        {creditors.map((creditor) => (
                                            <TouchableOpacity
                                                key={creditor.id}
                                                onPress={() => setSelectedSupplierId(creditor.id)}
                                                className={`px-4 py-3 rounded-xl border mr-2 ${selectedSupplierId === creditor.id ? 'bg-sky-600 border-sky-500' : 'bg-surface border-surface-border'}`}
                                            >
                                                <Text className={selectedSupplierId === creditor.id ? 'text-ink font-bold' : 'text-ink'}>{creditor.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>

                            {/* Credit Toggle */}
                            <View className="mb-4 flex-row items-center justify-between bg-surface border border-surface-border rounded-xl p-4">
                                <Text className="text-ink font-medium">Bought on Credit?</Text>
                                <Switch
                                    value={newItem.is_credit || false}
                                    onValueChange={(val) => setNewItem({ ...newItem, is_credit: val })}
                                    trackColor={{ false: '#5c5c6b', true: '#f59e0b' }}
                                    thumbColor={newItem.is_credit ? '#ffffff' : '#8b8b99'}
                                />
                            </View>

                            <View className="mt-6">
                                <Button
                                    title="Record Lifting"
                                    onPress={handleCreateSubmit}
                                    loading={createMutation.isPending}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Lifting Details Modal */}
            <Modal
                visible={!!selectedLifting}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedLifting(null)}
            >
                <View className="flex-1 justify-end">
                    <View className="bg-surface-sunken border-t border-surface-border h-[70%] rounded-t-3xl shadow-2xl p-6">
                        <View className="flex-row justify-between items-start mb-6">
                            <View>
                                <Text className="text-2xl font-bold text-ink">{selectedLifting?.tank_name}</Text>
                                <Text className="text-ink-muted text-sm mt-1">{selectedLifting?.product_name} • {selectedLifting?.station_name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedLifting(null)}>
                                <Ionicons name="close-circle" size={32} color="#5c5c6b" />
                            </TouchableOpacity>
                        </View>

                        <View>
                            <View className="bg-surface p-4 rounded-xl mb-4">
                                <Text className="text-ink-muted text-xs uppercase mb-2 font-bold">Delivery Details</Text>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-surface-border">
                                    <Text className="text-ink">Date</Text>
                                    <Text className="text-ink">{selectedLifting?.lifting_date ? new Date(selectedLifting.lifting_date).toLocaleDateString() : 'N/A'}</Text>
                                </View>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-surface-border">
                                    <Text className="text-ink">Invoice #</Text>
                                    <Text className="text-ink font-mono">{selectedLifting?.invoice_number || 'N/A'}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-ink">Volume</Text>
                                    <Text className="text-emerald-700 font-bold">{selectedLifting?.volume_liters.toLocaleString()} L</Text>
                                </View>
                            </View>

                            <View className="bg-surface p-4 rounded-xl">
                                <Text className="text-ink-muted text-xs uppercase mb-2 font-bold">Financial</Text>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-surface-border">
                                    <Text className="text-ink">Price/Liter</Text>
                                    <Text className="text-ink font-mono">KES {selectedLifting?.buying_price_per_liter.toLocaleString()}</Text>
                                </View>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-surface-border">
                                    <Text className="text-ink">Total Cost</Text>
                                    <Text className="text-emerald-700 font-mono font-bold">KES {selectedLifting?.total_cost.toLocaleString()}</Text>
                                </View>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-surface-border">
                                    <Text className="text-ink">Tax Paid</Text>
                                    <Text className="text-ink font-mono">KES {selectedLifting?.tax_paid.toLocaleString()}</Text>
                                </View>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-surface-border">
                                    <Text className="text-ink">Supplier</Text>
                                    <Text className="text-sky-400 font-medium">{selectedLifting?.supplier?.name || 'N/A'}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-ink">Payment</Text>
                                    <View className={`px-2 py-0.5 rounded-full ${selectedLifting?.is_credit ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                        <Text className={`text-xs font-bold ${selectedLifting?.is_credit ? 'text-amber-700' : 'text-emerald-700'}`}>
                                            {selectedLifting?.is_credit ? 'Credit' : 'Cash'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View className="mt-auto pt-6 mb-10">
                            <Button
                                title="Delete Lifting"
                                variant="outline"
                                onPress={handleDeletePress}
                                loading={deleteMutation.isPending}
                                style={{ borderColor: '#bf0a30' }}
                            />
                            <Text className="text-accent text-center mt-2 text-xs">
                                Note: This will reverse the inventory effect.
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
