import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
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
                className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700 w-full shadow-lg shadow-blue-900/10"
            >
                <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-row items-center">
                        <View className="bg-emerald-500/20 p-2.5 rounded-xl mr-3">
                            <SymbolView name="clock.badge.checkmark.fill" size={24} tintColor="#34d399" />
                        </View>
                        <View>
                            <Text className="text-white text-lg font-bold">Active Shift</Text>
                            <Text className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                                {activeShift.station_name} • {new Date(activeShift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    <View className="bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <Text className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            Running
                        </Text>
                    </View>
                </View>

                <View className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-6">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-slate-400 text-xs font-medium uppercase">Shift ID</Text>
                        <Text className="text-slate-200 text-sm font-mono">{activeShift.id.slice(0, 8)}...</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-slate-400 text-xs font-medium uppercase">Started</Text>
                        <Text className="text-slate-200 text-sm">{new Date(activeShift.started_at).toLocaleDateString()}</Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => setLockModalVisible(true)}
                    disabled={isLockShiftPending}
                    className={`w-full bg-red-500/10 border border-red-500/30 py-4 rounded-xl items-center flex-row justify-center active:bg-red-500/20 active:scale-95 transition-all ${isLockShiftPending ? 'opacity-70' : ''}`}
                >
                    {isLockShiftPending ? (
                        <>
                            <ActivityIndicator size="small" color="#f87171" style={{ marginRight: 8 }} />
                            <Text className="text-red-400 text-sm font-bold uppercase tracking-wider">
                                Locking Shift...
                            </Text>
                        </>
                    ) : (
                        <>
                            <SymbolView name="stop.circle.fill" size={16} tintColor="#f87171" style={{ marginRight: 8 }} />
                            <Text className="text-red-400 text-sm font-bold uppercase tracking-wider">
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
            className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700 w-full items-center shadow-lg shadow-blue-900/10"
        >
            <View
                className="bg-blue-900/30 p-6 rounded-full mb-6 border border-blue-500/20"
            >
                <SymbolView name={"building.2.fill" as any} size={48} tintColor="#60a5fa" />
            </View>

            <Text className="text-white text-2xl font-black uppercase tracking-tight text-center mb-2">
                No Active Shift
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6 font-medium max-w-[250px] leading-5">
                Start a new shift to begin logging transactions and readings.
            </Text>

            <Pressable
                onPress={handleStart}
                disabled={isCreateShiftPending}
                className={`w-full bg-blue-600 py-4 rounded-xl items-center flex-row justify-center active:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/20 ${isCreateShiftPending ? 'opacity-70' : ''}`}
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
