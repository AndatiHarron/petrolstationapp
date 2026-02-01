import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useShiftStore } from '@/features/api/shift/shift';
import { useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner-native';

import type { ShiftResource } from '@/features/api/model';

interface StartShiftViewProps {
    activeShift?: ShiftResource;
}

export function StartShiftView({ activeShift }: StartShiftViewProps) {
    const queryClient = useQueryClient();
    const { mutateAsync: startShift, isPending: isCreateShiftPending } = useShiftStore({
        mutation: {
            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: ['activeShift'],
                });
            },
            onError: (error) => {
                const message = getApiErrorMessage(error);
                toast.error('Start shift failed', {
                    description: message,
                });
            }
        }
    });

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startShift();
    };

    if (activeShift) {
        return (
            <View className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700 w-full shadow-lg shadow-blue-900/10">
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

                <View className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-2">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-slate-400 text-xs font-medium uppercase">Shift ID</Text>
                        <Text className="text-slate-200 text-sm font-mono">{activeShift.id.slice(0, 8)}...</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-slate-400 text-xs font-medium uppercase">Started</Text>
                        <Text className="text-slate-200 text-sm">{new Date(activeShift.started_at).toLocaleDateString()}</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="bg-slate-800 rounded-3xl p-6 mb-6 border border-slate-700 w-full items-center shadow-lg shadow-blue-900/10">
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

            <TouchableOpacity
                onPress={handleStart}
                disabled={isCreateShiftPending}
                className={`w-full bg-blue-600 py-4 rounded-xl items-center flex-row justify-center active:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/20 ${isCreateShiftPending ? 'opacity-70' : ''}`}
            >
                {isCreateShiftPending ? (
                    <View className="flex-row items-center justify-center space-x-2 gap-2">
                        <ActivityIndicator color="white" />
                        <Text className="text-white text-lg font-bold uppercase tracking-wider">
                            Starting Shift...
                        </Text>
                    </View>
                ) : (
                    <Text className="text-white text-lg font-bold uppercase tracking-wider">
                        Start New Shift
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}
