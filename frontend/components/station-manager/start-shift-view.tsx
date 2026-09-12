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
                console.log(error, message)
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
                className="bg-surface rounded-3xl p-6 mb-6 border border-surface-border w-full"
            >
                <View className="flex-row items-center justify-between gap-3 mb-6">
                    {/* flex-1 + min-w-0 so a long station name ellipsises instead of
                        shoving the "Running" pill past the right edge of the card. */}
                    <View className="flex-row items-center flex-1 min-w-0">
                        <View className="bg-emerald-50 p-2.5 rounded-xl mr-3 shrink-0">
                            <CircleCheck size={24} color="#059669" />
                        </View>
                        <View className="flex-1 min-w-0">
                            <Text className="text-ink text-lg font-bold" numberOfLines={1}>Active Shift</Text>
                            <Text className="text-ink-muted text-xs font-medium uppercase tracking-wider" numberOfLines={1}>
                                {activeShift.station_name} • {new Date(activeShift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    <View className="bg-emerald-50 border border-emerald-600 px-3 py-1.5 rounded-full shrink-0">
                        <Text className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                            Running
                        </Text>
                    </View>
                </View>

                <View className="bg-surface-sunken rounded-xl p-4 border border-surface-border mb-6">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-ink-muted text-xs font-medium uppercase">Shift ID</Text>
                        <Text className="text-ink text-sm font-mono">{activeShift.id.slice(0, 8)}...</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-ink-muted text-xs font-medium uppercase">Started</Text>
                        <Text className="text-ink text-sm">{new Date(activeShift.started_at).toLocaleDateString()}</Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => setLockModalVisible(true)}
                    disabled={isLockShiftPending}
                    className={`h-12 w-full flex-row items-center justify-center rounded-xl border border-accent/20 bg-accent-subtle active:bg-accent-subtle ${isLockShiftPending ? 'opacity-70' : ''}`}
                >
                    {isLockShiftPending ? (
                        <>
                            <ActivityIndicator size="small" color="#bf0a30" style={{ marginRight: 8 }} />
                            <Text className="text-accent text-sm font-bold uppercase tracking-wider">
                                Locking Shift...
                            </Text>
                        </>
                    ) : (
                        <>
                            <CircleStop size={16} color="#bf0a30" style={{ marginRight: 8 }} />
                            <Text className="text-accent text-sm font-bold uppercase tracking-wider">
                                Stop & Lock Shift
                            </Text>
                        </>
                    )}
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
            className="bg-surface rounded-3xl p-6 mb-6 border border-surface-border w-full items-center"
        >
            <View
                className="bg-brand-subtle p-6 rounded-full mb-6"
            >
                <Building2 size={48} color="#040273" />
            </View>

            <Text className="text-ink text-2xl font-black uppercase tracking-tight text-center mb-2">
                No Active Shift
            </Text>
            <Text className="text-ink-muted text-sm text-center mb-6 font-medium max-w-[250px] leading-5">
                Start a new shift to begin logging transactions and readings.
            </Text>

            <Pressable
                onPress={handleStart}
                disabled={isCreateShiftPending}
                className={`h-12 w-full flex-row items-center justify-center rounded-xl bg-brand active:opacity-80 ${isCreateShiftPending ? 'opacity-70' : ''}`}
            >
                {isCreateShiftPending ? (
                    <Animated.View entering={FadeIn} className="flex-row items-center justify-center space-x-2 gap-2">
                        <ActivityIndicator color="white" />
                        <Text className="text-white text-lg font-bold uppercase tracking-wider">
                            Starting Shift...
                        </Text>
                    </Animated.View>
                ) : (
                    <Text className="text-white text-lg font-bold uppercase tracking-wider">
                        Start New Shift
                    </Text>
                )}
            </Pressable>
        </Animated.View>
    );
}
