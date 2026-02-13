import { useQueryClient } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LockShiftModal } from '@/components/station-manager/lock-shift-modal';
import { SkeletonCard } from '@/components/station-manager/skeleton-card';
import type {
    AuthenticationExceptionResponse,
    LockShiftRequest,
    ShiftCurrent200,
    ShiftResource,
} from '@/features/api/model';
import {
    getShiftIndexQueryKey,
    useShiftCurrent,
    useShiftLock,
    useShiftStore,
} from '@/features/api/shift/shift';

export function CurrentShiftTab() {
    const queryClient = useQueryClient();
    const [lockModalVisible, setLockModalVisible] = React.useState(false);

    // ---- Data ----
    const { data: shiftResponse, isLoading, refetch, isRefetching } = useShiftCurrent({
        query: { queryKey: ['activeShift'] },
    });

    const actualShiftData = shiftResponse as unknown as
        (ShiftCurrent200 | AuthenticationExceptionResponse | undefined);
    const activeShift: ShiftResource | undefined =
        actualShiftData && 'data' in actualShiftData ? actualShiftData.data : undefined;

    // ---- Mutations ----
    const { mutate: startShift, isPending: isStarting } = useShiftStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['activeShift'] });
                queryClient.invalidateQueries({ queryKey: getShiftIndexQueryKey() });
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.message || 'Failed to start shift. Please try again.');
            },
        },
    });

    const { mutate: lockShift, isPending: isLocking } = useShiftLock({
        mutation: {
            onSuccess: () => {
                setLockModalVisible(false);
                queryClient.invalidateQueries({ queryKey: ['activeShift'] });
                queryClient.invalidateQueries({ queryKey: getShiftIndexQueryKey() });
                queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.message || 'Failed to lock shift. Please try again.');
            },
        },
    });

    // ---- Handlers ----
    const handleStartShift = useCallback(() => {
        Alert.alert(
            'Start New Shift',
            'Are you sure you want to start a new shift? This will record the current time as the shift start.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start Shift', style: 'default', onPress: () => startShift() },
            ]
        );
    }, [startShift]);

    const handleLockShift = useCallback(() => {
        if (activeShift) setLockModalVisible(true);
    }, [activeShift]);

    const handleLockSubmit = useCallback(
        (data: LockShiftRequest) => {
            if (activeShift) lockShift({ shift: activeShift.id, data });
        },
        [activeShift, lockShift]
    );

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-KE', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-slate-400 text-sm">
                    {isLoading ? 'Checking status...' : (activeShift ? 'Active shift in progress' : 'No active shift')}
                </Text>

                {isLoading ? (
                    <SkeletonCard variant="shift" />
                ) : activeShift ? (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(200)}
                        className="bg-slate-800/70 rounded-2xl border border-slate-700/50 overflow-hidden"
                    >
                        <View className="bg-emerald-600/20 border-b border-emerald-500/30 px-5 py-3 flex-row items-center gap-2">
                            <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <Text className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Active Shift</Text>
                        </View>

                        <View className="p-5">
                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="bg-blue-500/20 w-12 h-12 rounded-xl items-center justify-center">
                                    <SymbolView name="clock.fill" size={24} tintColor="#60a5fa" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Started At</Text>
                                    <Text className="text-white font-bold text-lg">{formatDateTime(activeShift.started_at)}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="bg-purple-500/20 w-12 h-12 rounded-xl items-center justify-center">
                                    <SymbolView name="building.2.fill" size={24} tintColor="#a78bfa" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Station</Text>
                                    <Text className="text-white font-bold text-lg">{activeShift.station_name}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-3">
                                <View className="bg-amber-500/20 w-12 h-12 rounded-xl items-center justify-center">
                                    <SymbolView name="banknote.fill" size={24} tintColor="#fbbf24" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Financials</Text>
                                    <View className="flex-row gap-4">
                                        <Text className="text-white font-bold">
                                            Collected: <Text className="text-emerald-400">Sh {activeShift.financials?.collected?.toLocaleString() || '0'}</Text>
                                        </Text>
                                        <Text className="text-white font-bold">
                                            Expected: <Text className="text-amber-400">Sh {activeShift.financials?.expected?.toLocaleString() || '0'}</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {activeShift.variance_alert && (
                                <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex-row items-center gap-2">
                                    <SymbolView name="exclamationmark.triangle.fill" size={18} tintColor="#ef4444" />
                                    <Text className="text-red-400 font-medium text-sm">Variance detected in this shift</Text>
                                </View>
                            )}
                        </View>

                        <View className="p-5 pt-0">
                            <TouchableOpacity
                                onPress={handleLockShift}
                                disabled={isLocking}
                                className="bg-red-600 py-4 rounded-xl items-center flex-row justify-center gap-2 active:bg-red-700"
                            >
                                {isLocking ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <SymbolView name="lock.fill" size={18} tintColor="#fff" />
                                )}
                                <Text className="text-white font-bold text-base uppercase tracking-wider">
                                    {isLocking ? 'Locking...' : 'Stop & Lock Shift'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(200)}
                        className="bg-slate-800/70 rounded-2xl border border-slate-700/50 overflow-hidden"
                    >
                        <View className="p-8 items-center">
                            <View className="bg-blue-500/20 w-20 h-20 rounded-full items-center justify-center mb-5">
                                <SymbolView name="play.fill" size={36} tintColor="#60a5fa" />
                            </View>
                            <Text className="text-white font-bold text-xl mb-2 text-center">No Active Shift</Text>
                            <Text className="text-slate-400 text-center mb-6 leading-6">
                                Start a new shift to begin recording pump readings, sales, and transactions.
                            </Text>
                            <TouchableOpacity
                                onPress={handleStartShift}
                                disabled={isStarting}
                                className="bg-blue-600 w-full py-4 rounded-xl items-center flex-row justify-center gap-2 active:bg-blue-700"
                            >
                                {isStarting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <SymbolView name="play.circle.fill" size={20} tintColor="#fff" />
                                )}
                                <Text className="text-white font-bold text-base uppercase tracking-wider">
                                    {isStarting ? 'Starting...' : 'Start New Shift'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                <TouchableOpacity
                    onPress={() => refetch()}
                    disabled={isRefetching}
                    className="bg-slate-800/50 border border-slate-700/50 py-3 rounded-xl items-center flex-row justify-center gap-2 active:bg-slate-700"
                >
                    {isRefetching ? (
                        <ActivityIndicator size="small" color="#94a3b8" />
                    ) : (
                        <SymbolView name="arrow.clockwise" size={16} tintColor="#94a3b8" />
                    )}
                    <Text className="text-slate-400 font-medium">
                        {isRefetching ? 'Refreshing...' : 'Refresh Status'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Lock Shift Modal */}
            {activeShift && (
                <LockShiftModal
                    visible={lockModalVisible}
                    onClose={() => setLockModalVisible(false)}
                    onSubmit={handleLockSubmit}
                    activeShift={activeShift}
                />
            )}
        </>
    );
}
