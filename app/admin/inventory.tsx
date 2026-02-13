import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { useLiftingsStore, useLiftingsDestroy, getLiftingsIndexQueryKey } from '../../features/api/lifting/lifting';
import { useTanksIndex, getTanksIndexQueryKey } from '../../features/api/tank/tank';
import { useStationsIndex } from '../../features/api/station/station';
import { useCreditorsIndex } from '../../features/api/creditor/creditor';
import { getAuditLogIndexQueryKey } from '../../features/api/audit-log/audit-log';
import type {
    LiftingsIndex200,
    LiftingsIndex200Meta,
    LiftingsIndex200Links,
    LiftingResource,
    StoreLiftingRequest,
    TanksIndex200,
    StationsIndex200,
    CreditorsIndex200,
    StationResource,
    TankResource,
    SupplierResource,
} from '../../features/api/model';
import { api } from '../../lib/axios';
import { LiftingsList } from '../../components/admin/inventory/liftings-list';
import { AddLiftingModal } from '../../components/admin/inventory/add-lifting-modal';
import { Button } from '../../components/button';

// Custom fetch function for paginated liftings
const fetchLiftings = async (page: number): Promise<LiftingsIndex200> => {
    const response = await api.get<LiftingsIndex200>('/v1/liftings', {
        params: { page },
    });
    return response.data;
};

export default function InventoryTab() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLifting, setSelectedLifting] = useState<LiftingResource | null>(null);

    // Fetch liftings with pagination
    const { data: liftingsData, isLoading, isFetching, refetch, error } = useQuery({
        queryKey: [...getLiftingsIndexQueryKey(), { page }],
        queryFn: () => fetchLiftings(page),
    });

    // Fetch stations, tanks, and creditors for the add modal
    const { data: stationsData, isLoading: isLoadingStations } = useStationsIndex();
    const { data: tanksData, isLoading: isLoadingTanks } = useTanksIndex();
    const { data: creditorsData, isLoading: isLoadingCreditors } = useCreditorsIndex();

    // Extract data
    const meta: LiftingsIndex200Meta | undefined = liftingsData?.meta;
    const links: LiftingsIndex200Links | undefined = liftingsData?.links;
    const liftingsList = liftingsData?.data ?? [];
    const stations: StationResource[] = (stationsData as unknown as StationsIndex200)?.data ?? [];
    const tanks: TankResource[] = (tanksData as unknown as TanksIndex200)?.data ?? [];
    const creditors: SupplierResource[] = (creditorsData as unknown as CreditorsIndex200)?.data ?? [];

    // ─── Mutations ────────────────────────────────────────────
    const createMutation = useLiftingsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getLiftingsIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
                setIsCreateModalOpen(false);
                Alert.alert('Success', 'Lifting recorded successfully.');
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.response?.data?.message || 'Failed to record lifting.');
            },
        },
    });

    const deleteMutation = useLiftingsDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getLiftingsIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
                setSelectedLifting(null);
                Alert.alert('Success', 'Lifting deleted successfully.');
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.response?.data?.message || 'Failed to delete lifting.');
            },
        },
    });

    // ─── Handlers ────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handleCreateSubmit = useCallback((data: StoreLiftingRequest) => {
        createMutation.mutate({ data });
    }, [createMutation]);

    const handleDeletePress = useCallback(() => {
        if (!selectedLifting?.id) return;
        Alert.alert(
            'Delete Lifting',
            'Are you sure you want to delete this lifting record? This will reverse the inventory effect and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate({ lifting: selectedLifting.id }),
                },
            ],
        );
    }, [selectedLifting, deleteMutation]);

    // ─── Render ───────────────────────────────────────────────
    if (error) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center px-8">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-white text-lg font-bold mt-4 text-center">
                    Error loading liftings
                </Text>
                <Text className="text-slate-500 text-sm mt-2 text-center">
                    {(error as Error).message}
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-4 py-4 flex-row justify-between items-center border-b border-slate-800">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-2xl font-bold text-white">Inventory</Text>
                        {meta && (
                            <View className="bg-blue-500/20 px-2.5 py-1 rounded-full">
                                <Text className="text-blue-400 text-xs font-bold">{meta.total}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => setIsCreateModalOpen(true)}
                        className="flex-row items-center gap-1.5 bg-blue-600 px-4 py-2.5 rounded-full"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text className="text-white font-bold text-sm">Add Lifting</Text>
                    </TouchableOpacity>
                </View>

                {/* Liftings List */}
                <LiftingsList
                    data={liftingsList}
                    meta={meta}
                    links={links}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    onPressItem={setSelectedLifting}
                    onPageChange={handlePageChange}
                />

                {/* Add Lifting Modal */}
                <AddLiftingModal
                    visible={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateSubmit}
                    isSubmitting={createMutation.isPending}
                    stations={stations}
                    tanks={tanks}
                    creditors={creditors}
                    isLoadingStations={isLoadingStations}
                    isLoadingTanks={isLoadingTanks}
                    isLoadingCreditors={isLoadingCreditors}
                />

                {/* Lifting Details Modal */}
                <Modal
                    visible={!!selectedLifting}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedLifting(null)}
                >
                    <View className="flex-1 justify-end">
                        <View className="bg-slate-900 border-t border-slate-700 h-[70%] rounded-t-3xl shadow-2xl p-6">
                            <View className="flex-row justify-between items-start mb-6">
                                <View className="flex-1 mr-4">
                                    <Text className="text-2xl font-bold text-white">{selectedLifting?.tank_name}</Text>
                                    <Text className="text-slate-400 text-sm mt-1">
                                        {selectedLifting?.product_name} • {selectedLifting?.station_name}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedLifting(null)}>
                                    <Ionicons name="close-circle" size={32} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            {/* Delivery Details */}
                            <View className="bg-slate-800 p-4 rounded-xl mb-4">
                                <Text className="text-slate-400 text-xs uppercase mb-3 font-bold tracking-wider">Delivery Details</Text>
                                <DetailRow label="Date" value={selectedLifting?.lifting_date ? new Date(selectedLifting.lifting_date).toLocaleDateString() : 'N/A'} />
                                <DetailRow label="Invoice #" value={selectedLifting?.invoice_number || 'N/A'} mono />
                                <DetailRow label="Volume" value={`${selectedLifting?.volume_liters.toLocaleString()} L`} highlight last />
                            </View>

                            {/* Financial Details */}
                            <View className="bg-slate-800 p-4 rounded-xl">
                                <Text className="text-slate-400 text-xs uppercase mb-3 font-bold tracking-wider">Financial</Text>
                                <DetailRow label="Price/Liter" value={`KES ${selectedLifting?.buying_price_per_liter.toLocaleString()}`} mono />
                                <DetailRow label="Total Cost" value={`KES ${selectedLifting?.total_cost.toLocaleString()}`} highlight mono />
                                <DetailRow label="Tax Paid" value={`KES ${selectedLifting?.tax_paid.toLocaleString()}`} mono />
                                <DetailRow label="Supplier" value={selectedLifting?.supplier?.name || 'N/A'} />
                                <DetailRow label="Payment" value={selectedLifting?.is_credit ? 'Credit' : 'Cash'} highlight={!selectedLifting?.is_credit} last />
                            </View>

                            {/* Delete */}
                            <View className="mt-auto pt-6 mb-10">
                                <Button
                                    title="Delete Lifting"
                                    variant="outline"
                                    onPress={handleDeletePress}
                                    loading={deleteMutation.isPending}
                                    style={{ borderColor: '#ef4444' }}
                                />
                                <Text className="text-red-500 text-center mt-2 text-xs">
                                    Note: This will reverse the inventory effect.
                                </Text>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

// ─── Helper ────────────────────────────────────────────────────
function DetailRow({ label, value, mono, highlight, last }: {
    label: string;
    value: string;
    mono?: boolean;
    highlight?: boolean;
    last?: boolean;
}) {
    return (
        <View className={`flex-row justify-between items-center py-2 ${last ? '' : 'border-b border-slate-700'}`}>
            <Text className="text-slate-300 text-sm">{label}</Text>
            <Text className={`text-sm font-semibold ${mono ? 'font-mono' : ''} ${highlight ? 'text-emerald-400' : 'text-white'}`}>
                {value}
            </Text>
        </View>
    );
}
