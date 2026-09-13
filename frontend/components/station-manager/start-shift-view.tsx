import React from 'react';
import { Building2, CircleCheck, CircleStop } from 'lucide-react-native';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useShiftLock, useShiftStore } from '@/features/api/shift/shift';
import { useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/api-error';
import {
    getActiveShiftQueryKey,
    invalidateOnShiftLock,
    invalidateOnShiftStart,
} from '@/lib/query-invalidations';
import { toast } from 'sonner-native';
import { LockShiftModal } from './lock-shift-modal';

import type { LockShiftRequest, ShiftResource } from '@/features/api/model';

interface StartShiftViewProps {
    activeShift?: ShiftResource;
}

export function StartShiftView({ activeShift }: StartShiftViewProps) {
    const queryClient = useQueryClient();
    const { mutateAsync: startShift, isPending: isCreateShiftPending } = useShiftStore({
        mutation: {
            onSuccess: () => {
                invalidateOnShiftStart(queryClient);
            },
            onError: (error) => {
                const message = getApiErrorMessage(error);
                toast.error('Start shift failed', {
                    description: message,
                });
            }
        }
    });

    const { mutateAsync: lockShift, isPending: isLockShiftPending } = useShiftLock({
        mutation: {
            onSuccess: (_res, variables) => {
                // Force UI update immediately to show "No Active Shift"
                queryClient.setQueryData(getActiveShiftQueryKey(), null);
                invalidateOnShiftLock(queryClient, variables?.shift);
            },
            onError: (error) => {
                const message = getApiErrorMessage(error);
                toast.error('Lock shift failed', {
                    description: message,
                });
            }
        }
    });

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startShift();
    };

    const [lockModalVisible, setLockModalVisible] = React.useState(false);

    const handleLockShiftSubmit = (data: LockShiftRequest) => {
        if (activeShift) {
            lockShift({ shift: activeShift.id, data });
        }
        setLockModalVisible(false); // Close for now
    };

    if (activeShift) {
        return (
            <Animated.View
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(200)}
                layout={Layout.springify()}
                className="mb-4 w-full rounded-2xl border border-surface-border bg-surface p-4"
            >
                <View className="mb-3 flex-row items-center justify-between gap-2">
                    {/* flex-1 + min-w-0 so a long station name ellipsises instead of
                        shoving the "Running" pill past the right edge of the card. */}
                    <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                        <View
                            style={{ width: 36, height: 36, borderRadius: 12 }}
                            className="shrink-0 items-center justify-center bg-emerald-50"
                        >
                            <CircleCheck size={17} color="#059669" />
                        </View>
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-[15px] font-bold" numberOfLines={1}>
                                Active shift
                            </Text>
                            <Text className="text-ink-faint text-[10.5px]" numberOfLines={1}>
                                {activeShift.station_name} • {new Date(activeShift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    <View className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Running
                        </Text>
                    </View>
                </View>

                <View className="mb-3 gap-1.5 rounded-xl bg-surface-sunken px-3 py-2.5">
                    <View className="flex-row items-center justify-between gap-2">
                        <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                            Shift ID
                        </Text>
                        <Text className="text-ink shrink font-mono text-[11.5px]" numberOfLines={1}>
                            {activeShift.id.slice(0, 8)}
                        </Text>
                    </View>
                    <View className="flex-row items-center justify-between gap-2">
                        <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                            Started
                        </Text>
                        <Text className="text-ink shrink text-[11.5px]" numberOfLines={1}>
                            {new Date(activeShift.started_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => setLockModalVisible(true)}
                    disabled={isLockShiftPending}
                    className={`h-12 w-full flex-row items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent-subtle active:opacity-70 ${isLockShiftPending ? 'opacity-70' : ''}`}
                >
                    {isLockShiftPending ? (
                        <ActivityIndicator size="small" color="#bf0a30" />
                    ) : (
                        <CircleStop size={16} color="#bf0a30" />
                    )}
                    <Text className="text-accent text-[13px] font-bold uppercase tracking-wider">
                        {isLockShiftPending ? 'Locking shift' : 'Stop & lock shift'}
                    </Text>
                </Pressable>

                <LockShiftModal
                    visible={lockModalVisible}
                    activeShift={activeShift}
                    onClose={() => setLockModalVisible(false)}
                    onSubmit={handleLockShiftSubmit}
                />
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify()}
            className="mb-4 w-full items-center rounded-2xl border border-surface-border bg-surface p-5"
        >
            <View
                style={{ width: 52, height: 52, borderRadius: 18 }}
                className="mb-3 items-center justify-center bg-brand-subtle"
            >
                <Building2 size={24} color="#040273" />
            </View>

            <Text className="text-ink text-[16px] font-bold">No active shift</Text>
            <Text className="text-ink-muted mb-4 mt-1 max-w-[260px] text-center text-[12px] leading-[17px]">
                Start one to begin logging readings and transactions.
            </Text>

            <Pressable
                onPress={handleStart}
                disabled={isCreateShiftPending}
                className={`h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80 ${isCreateShiftPending ? 'opacity-70' : ''}`}
            >
                {isCreateShiftPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                <Text className="text-[13px] font-bold uppercase tracking-wider text-white">
                    {isCreateShiftPending ? 'Starting shift' : 'Start new shift'}
                </Text>
            </Pressable>
        </Animated.View>
    );
}
