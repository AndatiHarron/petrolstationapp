import { useQueryClient } from '@tanstack/react-query';
import { Banknote, Building2, CirclePlay, Clock, Lock, Play, RotateCw } from 'lucide-react-native';
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
    useShiftCurrent,
    useShiftLock,
    useShiftStore,
} from '@/features/api/shift/shift';
import {
    getActiveShiftQueryKey,
    invalidateOnShiftLock,
    invalidateOnShiftStart,
} from '@/lib/query-invalidations';
import { useTabBarClearance } from '@/components/glass-tab-bar';

export function CurrentShiftTab() {
    const tabBarClearance = useTabBarClearance();

    const queryClient = useQueryClient();
    const [lockModalVisible, setLockModalVisible] = React.useState(false);

    // ---- Data ----
    const { data: shiftResponse, isLoading, refetch, isRefetching } = useShiftCurrent({
        query: { queryKey: getActiveShiftQueryKey() },
    });

    const actualShiftData = shiftResponse as unknown as
        (ShiftCurrent200 | AuthenticationExceptionResponse | undefined);
    const activeShift: ShiftResource | undefined =
        actualShiftData && 'data' in actualShiftData ? actualShiftData.data : undefined;

    // ---- Mutations ----
    const { mutate: startShift, isPending: isStarting } = useShiftStore({
        mutation: {
            onSuccess: () => {
                invalidateOnShiftStart(queryClient);
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.message || 'Failed to start shift. Please try again.');
            },
        },
    });

    const { mutate: lockShift, isPending: isLocking } = useShiftLock({
        mutation: {
            onSuccess: (_res, variables) => {
                setLockModalVisible(false);
                // Force UI update immediately to show "No Active Shift"
                queryClient.setQueryData(getActiveShiftQueryKey(), null);
                invalidateOnShiftLock(queryClient, variables?.shift);
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
                contentContainerStyle={{ padding: 16, paddingBottom: tabBarClearance, gap: 16 }}
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-ink-muted text-sm">
                    {isLoading ? 'Checking status...' : (activeShift ? 'Active shift in progress' : 'No active shift')}
                </Text>

                {isLoading ? (
                    <SkeletonCard variant="shift" />
                ) : activeShift ? (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(200)}
                        className="bg-surface rounded-2xl border border-surface-border overflow-hidden"
                    >
                        <View className="bg-emerald-50 border-b border-emerald-600 px-5 py-3 flex-row items-center gap-2">
                            <View className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                            <Text className="text-emerald-700 font-bold text-sm uppercase tracking-wider">Active Shift</Text>
                        </View>

                        <View className="p-5">
                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="bg-brand-subtle w-12 h-12 rounded-xl items-center justify-center">
                                    <Clock size={24} color="#040273" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-ink-muted text-xs uppercase tracking-wider mb-0.5">Started At</Text>
                                    <Text className="text-ink font-bold text-lg">{formatDateTime(activeShift.started_at)}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="bg-brand-subtle w-12 h-12 rounded-xl items-center justify-center">
                                    <Building2 size={24} color="#040273" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-ink-muted text-xs uppercase tracking-wider mb-0.5">Station</Text>
                                    <Text className="text-ink font-bold text-lg">{activeShift.station_name}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-3">
                                <View className="bg-amber-50 w-12 h-12 rounded-xl items-center justify-center">
                                    <Banknote size={24} color="#b45309" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-ink-muted text-xs uppercase tracking-wider mb-0.5">Financials</Text>
                                    <View className="flex-row gap-4">
                                        <Text className="text-ink font-bold">
                                            Collected: <Text className="text-emerald-700">Sh {activeShift.financials?.collected?.toLocaleString() || '0'}</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>

                        </View>

                        <View className="p-5 pt-0">
                            <TouchableOpacity
                                onPress={handleLockShift}
                                disabled={isLocking}
                                className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-accent active:opacity-85"
                            >
                                {isLocking ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Lock size={18} color="#fff" />
                                )}
                                <Text className="text-sm font-bold uppercase tracking-wider text-white">
                                    {isLocking ? 'Locking...' : 'Stop & Lock Shift'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(200)}
                        className="bg-surface rounded-2xl border border-surface-border overflow-hidden"
                    >
                        <View className="p-8 items-center">
                            <View className="bg-brand-subtle w-20 h-20 rounded-full items-center justify-center mb-5">
                                <Play size={36} color="#040273" />
                            </View>
                            <Text className="text-ink font-bold text-xl mb-2 text-center">No Active Shift</Text>
                            <Text className="text-ink-muted text-center mb-6 leading-6">
                                Start a new shift to begin recording pump readings, sales, and transactions.
                            </Text>
                            <TouchableOpacity
                                onPress={handleStartShift}
                                disabled={isStarting}
                                className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-85"
                            >
                                {isStarting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <CirclePlay size={20} color="#fff" />
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
                    className="bg-surface-sunken border border-surface-border py-3 rounded-xl items-center flex-row justify-center gap-2 active:bg-surface-border"
                >
                    {isRefetching ? (
                        <ActivityIndicator size="small" color="#8b8b99" />
                    ) : (
                        <RotateCw size={16} color="#8b8b99" />
                    )}
                    <Text className="text-ink-muted font-medium">
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
