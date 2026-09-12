import React, { useState, useCallback, useMemo, memo } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { InputField } from '@/components/input-field';
import { Button } from '@/components/button';
import { PaginationControls } from '@/components/pagination-controls';
import { SkeletonCard } from '@/components/station-manager/skeleton-card';
import type {
    CreditSaleResource,
    DipReading,
    MeterReading,
    NozzleResource,
    Payment,
    ShiftIndex200,
    ShiftResource,
    StoreEditRequestRequest,
    TankResource,
} from '@/features/api/model';
import { getShiftIndexQueryKey, useShiftIndex } from '@/features/api/shift/shift';
import { useNozzlesIndex } from '@/features/api/nozzle/nozzle';
import { useTanksIndex } from '@/features/api/tank/tank';
import {
    getEditRequestsIndexQueryKey,
    useEditRequestsStore,
} from '@/features/api/edit-request/edit-request';

// ── Memoised list item (list-performance-item-memo) ──
const ShiftHistoryItem = memo(({ item, onPress }: { item: ShiftResource; onPress: (item: ShiftResource) => void }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-KE', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="bg-surface p-4 rounded-xl mb-3 border border-surface-border"
        >
            <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1">
                    <Text className="text-ink text-base font-bold">{item.station_name}</Text>
                    <Text className="text-ink-muted text-sm mt-0.5">{formatDate(item.started_at)}</Text>
                </View>
                <View className={`px-2.5 py-1 rounded-lg ${item.status === 'locked' ? 'bg-ink-faint/40' : 'bg-emerald-500/15 border border-emerald-500/30'}`}>
                    <Text className={`text-xs font-semibold ${item.status === 'locked' ? 'text-ink-muted' : 'text-emerald-700'}`}>
                        {item.status?.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View className="mt-2">
                <View className="bg-surface-border p-2 rounded-lg">
                    <Text className="text-ink-muted text-[10px] uppercase">Collected</Text>
                    <Text className="text-emerald-700 text-sm font-bold">Sh {item.financials?.collected?.toLocaleString() ?? '0'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ── Main component ──
export function ShiftHistoryTab() {
    const queryClient = useQueryClient();
    // ---- Data ----
    const [historyPage, setHistoryPage] = useState(1);
    const { data: shiftsRaw, isLoading, isFetching, refetch } = useShiftIndex({
        query: {
            queryKey: [...getShiftIndexQueryKey(), { page: historyPage }],
        },
    });


    const shiftsData = (shiftsRaw as any) as ShiftIndex200 | undefined;
    const shiftsList = shiftsData?.data ?? [];
    const historyMeta = shiftsData?.meta;
    const historyLinks = shiftsData?.links;
    const [refreshing, setRefreshing] = useState(false);

    // Fetch nozzle & tank names for labels
    const { data: nozzlesRaw } = useNozzlesIndex();
    const { data: tanksRaw } = useTanksIndex();

    const nozzleNames = useMemo(() => {
        const list = ((nozzlesRaw as any)?.data ?? []) as NozzleResource[];
        const map: Record<string, string> = {};
        list.forEach(n => { map[n.id] = n.name; });
        return map;
    }, [nozzlesRaw]);

    const tankNames = useMemo(() => {
        const list = ((tanksRaw as any)?.data ?? []) as TankResource[];
        const map: Record<string, string> = {};
        list.forEach(t => { map[t.id] = t.name; });
        return map;
    }, [tanksRaw]);

    // ---- Detail / Edit state ----
    const [selectedShift, setSelectedShift] = useState<ShiftResource | null>(null);
    const [editShiftId, setEditShiftId] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editStep, setEditStep] = useState<1 | 2 | 3>(1);
    const [editReason, setEditReason] = useState('');

    // Edit form data matching lock shift schema
    const [editMeters, setEditMeters] = useState<Record<string, { nozzle_id: string; name: string; opening_reading: string; closing_reading: string }>>({});
    const [editDips, setEditDips] = useState<Record<string, { tank_id: string; name: string; dip_mm: string }>>({});
    const [editCash, setEditCash] = useState('');
    const [editMpesa, setEditMpesa] = useState('');
    const [editCredits, setEditCredits] = useState<Array<{ id: string; customer_id: string; customer_name: string; amount: string; vehicle_reg: string }>>([]);

    const editRequestMutation = useEditRequestsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getEditRequestsIndexQueryKey() });
                setIsEditModalOpen(false);
                setEditReason('');
                setEditStep(1);
                Alert.alert('Success', 'Edit request submitted for approval.');
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.response?.data?.message || 'Failed to submit edit request.');
            },
        },
    });

    // ---- Handlers (list-performance-callbacks) ----
    const handleShiftPress = useCallback((shift: ShiftResource) => {
        setSelectedShift(shift);
    }, []);

    const handleRequestEdit = useCallback(() => {
        if (!selectedShift) return;
        setEditShiftId(selectedShift.id);

        // Pre-fill meters
        const metersMap: typeof editMeters = {};
        (selectedShift.readings ?? []).forEach((r: MeterReading) => {
            metersMap[r.nozzle_id] = {
                nozzle_id: r.nozzle_id,
                name: nozzleNames[r.nozzle_id] ?? `Nozzle ${r.nozzle_id.slice(-4)}`,
                opening_reading: r.opening_reading,
                closing_reading: r.closing_reading,
            };
        });
        setEditMeters(metersMap);

        // Pre-fill dips
        const dipsMap: typeof editDips = {};
        (selectedShift.dips ?? []).forEach((d: DipReading) => {
            dipsMap[d.tank_id] = { tank_id: d.tank_id, name: tankNames[d.tank_id] ?? `Tank ${d.tank_id.slice(-4)}`, dip_mm: d.dip_mm };
        });
        setEditDips(dipsMap);

        // Pre-fill payments
        const payments = selectedShift.payments ?? [];
        const cashPmt = payments.find((p: Payment) => p.method === 'cash');
        const mpesaPmt = payments.find((p: Payment) => p.method === 'mpesa');
        setEditCash(cashPmt?.amount ?? '0');
        setEditMpesa(mpesaPmt?.amount ?? '0');

        // Pre-fill credit sales
        const credits = (selectedShift.credit_sales ?? []).map((cs: CreditSaleResource) => ({
            id: cs.id,
            customer_id: cs.customer_id,
            customer_name: cs.customer_name ?? 'Unknown',
            amount: cs.amount?.toString() ?? '0',
            vehicle_reg: cs.vehicle_reg ?? '',
        }));
        setEditCredits(credits);

        setEditReason('');
        setEditStep(1);
        setSelectedShift(null);
        setIsEditModalOpen(true);
    }, [selectedShift, nozzleNames, tankNames]);

    const handleEditSubmit = useCallback(() => {
        if (!editReason.trim()) {
            Alert.alert('Validation Error', 'Please provide a reason for this edit request.');
            return;
        }

        const requestedData = {
            meters: Object.values(editMeters).map(m => ({
                nozzle_id: m.nozzle_id,
                opening_reading: Number(m.opening_reading) || 0,
                closing_reading: Number(m.closing_reading) || 0,
            })),
            dips: Object.values(editDips).map(d => ({
                tank_id: d.tank_id,
                dip_mm: Number(d.dip_mm) || 0,
            })),
            payments: {
                cash: Number(editCash) || 0,
                mpesa: Number(editMpesa) || 0,
                credit: editCredits.length > 0 ? editCredits.map(c => ({
                    customer_id: c.customer_id,
                    amount: Number(c.amount) || 0,
                    vehicle_reg: c.vehicle_reg || null,
                })) : null,
            },
        };

        const payload: StoreEditRequestRequest = {
            model_type: 'App\\Models\\Shift',
            model_id: editShiftId,
            requested_data: [JSON.stringify(requestedData)],
            reason: editReason,
        };

        editRequestMutation.mutate({ data: payload });
    }, [editMeters, editDips, editCash, editMpesa, editCredits, editReason, editShiftId, editRequestMutation]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-KE', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <>
            <View className="flex-1 px-4 pt-2">
                {isLoading ? (
                    <View>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} className="mb-3 w-full">
                                <SkeletonCard variant="shift" style={{ width: '100%' }} />
                            </View>
                        ))}
                    </View>
                ) : (
                    <FlatList<ShiftResource>
                        data={shiftsList}
                        renderItem={({ item }) => (
                            <ShiftHistoryItem item={item} onPress={handleShiftPress} />
                        )}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                        }
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center p-10">
                                <Ionicons name="time-outline" size={48} color="#5c5c6b" />
                                <Text className="text-ink-muted text-center mt-4">No shift history found.</Text>
                            </View>
                        )}
                        ListFooterComponent={() => (
                            historyMeta && historyMeta.last_page > 1 ? (
                                <PaginationControls
                                    currentPage={historyMeta.current_page}
                                    lastPage={historyMeta.last_page}
                                    onPageChange={setHistoryPage}
                                    loading={isFetching}
                                    hasPrev={!!historyLinks?.prev}
                                    hasNext={!!historyLinks?.next}
                                />
                            ) : null
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>

            {/* Shift Detail Modal */}
            <Modal
                visible={!!selectedShift}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedShift(null)}
            >
                <View className="flex-1 justify-end">
                    <View className="bg-surface-sunken border-t border-surface-border h-[65%] rounded-t-3xl shadow-2xl p-6">
                        <View className="flex-row justify-between items-start mb-5">
                            <View className="flex-1">
                                <Text className="text-2xl font-bold text-ink">{selectedShift?.station_name}</Text>
                                <Text className="text-ink-muted text-sm mt-1">
                                    {selectedShift?.started_at ? formatDateTime(selectedShift.started_at) : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedShift(null)}>
                                <Ionicons name="close-circle" size={32} color="#5c5c6b" />
                            </TouchableOpacity>
                        </View>

                        <View className={`self-start px-3 py-1 rounded-lg mb-5 ${selectedShift?.status === 'locked' ? 'bg-surface-border/60' : 'bg-emerald-500/15'}`}>
                            <Text className={`text-xs font-bold ${selectedShift?.status === 'locked' ? 'text-ink-muted' : 'text-emerald-700'}`}>
                                {selectedShift?.status?.toUpperCase()}
                            </Text>
                        </View>

                        <View className="bg-surface p-4 rounded-xl mb-4">
                            <Text className="text-ink-muted text-xs uppercase mb-3 font-bold">Financial Summary</Text>
                            <View className="flex-row justify-between">
                                <Text className="text-ink">Collected</Text>
                                <Text className="text-emerald-700 font-bold font-mono">Sh {selectedShift?.financials?.collected?.toLocaleString() ?? '0'}</Text>
                            </View>
                        </View>

                        <View className="mt-auto pt-4 mb-16">
                            <Button
                                title="Request Edit"
                                onPress={handleRequestEdit}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Request Modal — 3-step wizard */}
            <Modal
                visible={isEditModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior="padding"
                    enabled={Platform.OS === 'ios'}
                    className="flex-1 justify-end"
                    keyboardVerticalOffset={0}
                >
                    <View className="bg-surface-sunken border-t border-surface-border h-[92%] rounded-t-3xl shadow-2xl flex overflow-hidden">
                        {/* Header */}
                        <View className="px-6 py-4 border-b border-surface-border flex-row items-center justify-between bg-surface-sunken rounded-t-3xl">
                            <View>
                                <Text className="text-ink text-xl font-bold">Request Shift Edit</Text>
                                <Text className="text-ink-muted text-xs font-medium uppercase tracking-wider">
                                    Step {editStep} of 3: {editStep === 1 ? 'Meter Readings' : editStep === 2 ? 'Tank Dips' : 'Payments & Reason'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                                <Ionicons name="close-circle" size={28} color="#5c5c6b" />
                            </TouchableOpacity>
                        </View>

                        {/* Progress Bar */}
                        <View className="flex-row h-1 w-full bg-surface">
                            <View className={`h-full bg-brand ${editStep === 1 ? 'w-1/3' : editStep === 2 ? 'w-2/3' : 'w-full'}`} />
                        </View>

                        <ScrollView
                            className="flex-1"
                            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View className="mb-4 bg-brand-subtle border border-brand/20 p-4 rounded-xl">
                                <Text className="text-brand text-sm">
                                    Correct the shift data below. An admin will review your changes before they are applied.
                                </Text>
                            </View>

                            {/* Step 1: Meter Readings */}
                            {editStep === 1 && (
                                <Animated.View entering={FadeIn}>
                                    <Text className="text-ink mb-4 leading-6">
                                        Update closing readings for each pump nozzle.
                                    </Text>
                                    {Object.values(editMeters).length === 0 ? (
                                        <View className="p-6 border-2 border-dashed border-surface-border rounded-xl items-center">
                                            <Text className="text-ink-muted text-sm">No meter readings recorded for this shift.</Text>
                                        </View>
                                    ) : (
                                        Object.entries(editMeters).map(([nozzleId, meter]) => (
                                            <View key={nozzleId} className="mb-4 bg-surface-sunken p-4 rounded-xl border border-surface-border">
                                                <View className="flex-row justify-between mb-3">
                                                    <Text className="text-ink font-bold">{meter.name}</Text>
                                                    <Text className="text-ink-muted text-xs">Opening: {meter.opening_reading}</Text>
                                                </View>
                                                <View className="flex-row items-center bg-surface-sunken border border-surface-border rounded-lg overflow-hidden h-12">
                                                    <View className="pl-3 pr-2 h-full justify-center border-r border-surface-border bg-surface/30">
                                                        <Ionicons name="speedometer-outline" size={18} color="#5c5c6b" />
                                                    </View>
                                                    <TextInput
                                                        className="flex-1 text-ink px-3 font-mono text-base h-full"
                                                        placeholder="Closing Reading"
                                                        placeholderTextColor="#5c5c6b"
                                                        keyboardType="numeric"
                                                        value={meter.closing_reading}
                                                        onChangeText={(v) => setEditMeters(p => ({
                                                            ...p,
                                                            [nozzleId]: { ...p[nozzleId], closing_reading: v }
                                                        }))}
                                                    />
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </Animated.View>
                            )}

                            {/* Step 2: Tank Dips */}
                            {editStep === 2 && (
                                <Animated.View entering={FadeIn}>
                                    <Text className="text-ink mb-4 leading-6">
                                        Update dip levels (in mm) for each tank.
                                    </Text>
                                    {Object.values(editDips).length === 0 ? (
                                        <View className="p-6 border-2 border-dashed border-surface-border rounded-xl items-center">
                                            <Text className="text-ink-muted text-sm">No dip readings recorded for this shift.</Text>
                                        </View>
                                    ) : (
                                        Object.entries(editDips).map(([tankId, dip]) => (
                                            <View key={tankId} className="mb-4 bg-surface-sunken p-4 rounded-xl border border-surface-border">
                                                <Text className="text-ink font-bold mb-3">{dip.name}</Text>
                                                <View className="flex-row items-center bg-surface-sunken border border-surface-border rounded-lg overflow-hidden h-12">
                                                    <View className="pl-3 pr-2 h-full justify-center border-r border-surface-border bg-surface/30">
                                                        <Ionicons name="resize-outline" size={18} color="#5c5c6b" />
                                                    </View>
                                                    <TextInput
                                                        className="flex-1 text-ink px-3 font-mono text-base h-full"
                                                        placeholder="Dip Level (mm)"
                                                        placeholderTextColor="#5c5c6b"
                                                        keyboardType="numeric"
                                                        value={dip.dip_mm}
                                                        onChangeText={(v) => setEditDips(p => ({
                                                            ...p,
                                                            [tankId]: { ...p[tankId], dip_mm: v }
                                                        }))}
                                                    />
                                                    <View className="px-3">
                                                        <Text className="text-ink-muted font-medium text-xs">mm</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </Animated.View>
                            )}

                            {/* Step 3: Payments & Reason */}
                            {editStep === 3 && (
                                <Animated.View entering={FadeIn}>
                                    {/* Cash */}
                                    <View className="mb-6">
                                        <Text className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-2">Cash Collection</Text>
                                        <View className="flex-row items-center bg-surface border border-surface-border rounded-xl overflow-hidden h-14">
                                            <View className="w-12 h-full justify-center items-center bg-surface-border border-r border-surface-border">
                                                <Text className="text-emerald-700 font-bold text-lg">Sh</Text>
                                            </View>
                                            <TextInput
                                                className="flex-1 text-ink px-4 font-bold text-lg h-full"
                                                placeholder="0.00"
                                                placeholderTextColor="#5c5c6b"
                                                keyboardType="decimal-pad"
                                                value={editCash}
                                                onChangeText={setEditCash}
                                            />
                                        </View>
                                    </View>

                                    {/* M-Pesa */}
                                    <View className="mb-6">
                                        <Text className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-2">M-Pesa Total</Text>
                                        <View className="flex-row items-center bg-surface border border-surface-border rounded-xl overflow-hidden h-14">
                                            <View className="w-12 h-full justify-center items-center bg-surface-border border-r border-surface-border">
                                                <Text className="text-emerald-700 font-bold text-lg">Sh</Text>
                                            </View>
                                            <TextInput
                                                className="flex-1 text-ink px-4 font-bold text-lg h-full"
                                                placeholder="0.00"
                                                placeholderTextColor="#5c5c6b"
                                                keyboardType="decimal-pad"
                                                value={editMpesa}
                                                onChangeText={setEditMpesa}
                                            />
                                        </View>
                                    </View>

                                    {/* Credit Sales */}
                                    <View className="mb-6">
                                        <Text className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-2">Credit Sales</Text>
                                        {editCredits.length === 0 ? (
                                            <View className="p-4 border-2 border-dashed border-surface-border rounded-xl items-center">
                                                <Text className="text-ink-muted text-sm">No credit sales recorded</Text>
                                            </View>
                                        ) : (
                                            editCredits.map((sale, idx) => (
                                                <View key={sale.id} className="bg-surface p-4 rounded-xl border border-surface-border mb-3">
                                                    <View className="flex-row justify-between items-center mb-2">
                                                        <Text className="text-ink-muted text-xs font-bold uppercase">Entry #{idx + 1} — {sale.customer_name}</Text>
                                                    </View>
                                                    <View className="flex-row gap-3">
                                                        <View className="flex-1">
                                                            <Text className="text-ink-muted text-xs mb-1">Amount</Text>
                                                            <View className="bg-surface-sunken border border-surface-border rounded-lg px-3 py-2">
                                                                <TextInput
                                                                    placeholder="0.00"
                                                                    placeholderTextColor="#5c5c6b"
                                                                    className="text-ink text-sm"
                                                                    keyboardType="decimal-pad"
                                                                    value={sale.amount}
                                                                    onChangeText={(v) => {
                                                                        setEditCredits(prev => prev.map(c =>
                                                                            c.id === sale.id ? { ...c, amount: v } : c
                                                                        ));
                                                                    }}
                                                                />
                                                            </View>
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-ink-muted text-xs mb-1">Vehicle Reg</Text>
                                                            <View className="bg-surface-sunken border border-surface-border rounded-lg px-3 py-2">
                                                                <TextInput
                                                                    placeholder="KAA 123A"
                                                                    placeholderTextColor="#5c5c6b"
                                                                    className="text-ink text-sm"
                                                                    autoCapitalize="characters"
                                                                    value={sale.vehicle_reg}
                                                                    onChangeText={(v) => {
                                                                        setEditCredits(prev => prev.map(c =>
                                                                            c.id === sale.id ? { ...c, vehicle_reg: v } : c
                                                                        ));
                                                                    }}
                                                                />
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))
                                        )}
                                    </View>

                                    {/* Reason */}
                                    <InputField
                                        label="Reason for Edit *"
                                        placeholder="Why should this shift data be corrected?"
                                        value={editReason}
                                        onChangeText={setEditReason}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </Animated.View>
                            )}
                        </ScrollView>

                        {/* Footer Navigation */}
                        <View className="absolute bottom-0 w-full px-6 py-4 bg-surface-sunken border-t border-surface-border flex-row gap-4">
                            {editStep > 1 && (
                                <TouchableOpacity
                                    onPress={() => setEditStep(prev => (prev - 1) as any)}
                                    className="h-12 flex-1 items-center justify-center rounded-xl border border-surface-border bg-surface"
                                >
                                    <Text className="text-ink text-sm font-bold uppercase tracking-wider">Back</Text>
                                </TouchableOpacity>
                            )}

                            {editStep < 3 ? (
                                <TouchableOpacity
                                    onPress={() => setEditStep(prev => (prev + 1) as any)}
                                    className="h-12 flex-[2] items-center justify-center rounded-xl bg-brand"
                                >
                                    <Text className="text-sm font-bold uppercase tracking-wider text-white">Next Step</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleEditSubmit}
                                    disabled={editRequestMutation.isPending}
                                    className={`h-12 flex-[2] items-center justify-center rounded-xl bg-brand ${editRequestMutation.isPending ? 'opacity-70' : ''}`}
                                >
                                    {editRequestMutation.isPending ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-sm font-bold uppercase tracking-wider text-white">Submit Edit Request</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}
