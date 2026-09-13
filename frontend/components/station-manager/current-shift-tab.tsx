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
                <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                    {isLoading ? 'Checking status' : activeShift ? 'Shift in progress' : 'No shift running'}
                </Text>

                {isLoading ? (
                    <SkeletonCard variant="shift" />
                ) : activeShift ? (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(200)}
                        className="bg-surface rounded-2xl border border-surface-border overflow-hidden"
                    >
                        <View className="flex-row items-center gap-2 border-b border-emerald-600 bg-emerald-50 px-4 py-2">
                            <View className="h-2 w-2 rounded-full bg-emerald-600" />
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                Active shift
                            </Text>
                        </View>

                        {/* One row shape for all three facts: a 36px tile, a small
                            uppercase label, the value under it. */}
                        <View className="gap-3 p-4">
                            <View className="flex-row items-center gap-2.5">
                                <View
                                    style={{ width: 36, height: 36, borderRadius: 12 }}
                                    className="shrink-0 items-center justify-center bg-brand-subtle"
                                >
                                    <Clock size={17} color="#040273" />
                                </View>
                                <View className="min-w-0 flex-1">
                                    <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                                        Started at
                                    </Text>
                                    <Text className="text-ink text-[13.5px] font-bold" numberOfLines={1}>
                                        {formatDateTime(activeShift.started_at)}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-2.5">
                                <View
                                    style={{ width: 36, height: 36, borderRadius: 12 }}
                                    className="shrink-0 items-center justify-center bg-brand-subtle"
                                >
                                    <Building2 size={17} color="#040273" />
                                </View>
                                <View className="min-w-0 flex-1">
                                    <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                                        Station
                                    </Text>
                                    <Text className="text-ink text-[13.5px] font-bold" numberOfLines={1}>
                                        {activeShift.station_name}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-2.5">
                                <View
                                    style={{ width: 36, height: 36, borderRadius: 12 }}
                                    className="shrink-0 items-center justify-center bg-emerald-50"
                                >
                                    <Banknote size={17} color="#059669" />
                                </View>
                                <View className="min-w-0 flex-1">
                                    <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                                        Collected
                                    </Text>
                                    <Text
                                        className="font-mono text-[13.5px] font-bold text-emerald-700"
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                    >
                                        Sh {activeShift.financials?.collected?.toLocaleString() || '0'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View className="p-4 pt-0">
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
                                <Text className="text-[13px] font-bold uppercase tracking-wider text-white">
                                    {isLocking ? 'Locking' : 'Stop & lock shift'}
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
                            <Text className="text-ink text-[16px] font-bold">No active shift</Text>
                            <Text className="text-ink-muted mb-4 mt-1 text-center text-[12px] leading-[17px]">
                                Start one to begin recording pump readings and sales.
                            </Text>
                            <TouchableOpacity
                                onPress={handleStartShift}
                                disabled={isStarting}
                                className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-85"
                            >
                                {isStarting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <CirclePlay size={17} color="#fff" />
                                )}
                                <Text className="text-[13px] font-bold uppercase tracking-wider text-white">
                                    {isStarting ? 'Starting' : 'Start new shift'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* Secondary to everything above it, so it is shorter than the
                    12-unit action buttons rather than matching their weight. */}
                <TouchableOpacity
                    onPress={() => refetch()}
                    disabled={isRefetching}
                    className="h-10 flex-row items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-surface-sunken active:opacity-70"
                >
                    {isRefetching ? (
                        <ActivityIndicator size="small" color="#8b8b99" />
                    ) : (
                        <RotateCw size={13} color="#8b8b99" />
                    )}
                    <Text className="text-ink-muted text-[11.5px] font-bold uppercase tracking-wider">
                        {isRefetching ? 'Refreshing' : 'Refresh status'}
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
