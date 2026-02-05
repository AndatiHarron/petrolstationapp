import React, { memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { useTanksIndex } from '@/features/api/tank/tank';
import type { TanksIndex200, AuthenticationExceptionResponse, TankResource } from '@/features/api/model';
import { TankCard } from './tank-card';
import { SkeletonCard } from './skeleton-card';

// Type guard for successful API response
function hasData<T extends { data: unknown }>(
    response: T | AuthenticationExceptionResponse | undefined
): response is T {
    return response !== undefined && 'data' in response;
}

export const TanksSection = memo(function TanksSection() {
    const { data: tanksRes, isLoading } = useTanksIndex();

    const tanksList = React.useMemo<TankResource[]>(() => {
        const res = tanksRes as unknown as TanksIndex200 | AuthenticationExceptionResponse | undefined;
        if (hasData<TanksIndex200>(res) && Array.isArray(res.data)) {
            return res.data;
        }
        return [];
    }, [tanksRes]);

    return (
        <Animated.View entering={FadeInDown.duration(400).delay(300)} className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
                <SymbolView name="drop.fill" size={18} tintColor="#a78bfa" />
                <Text className="text-white font-bold text-lg">Tanks</Text>
                {isLoading && <ActivityIndicator size="small" color="#a78bfa" />}
            </View>

            {isLoading ? (
                <View className="gap-3">
                    <SkeletonCard variant="tank" />
                    <SkeletonCard variant="tank" />
                </View>
            ) : tanksList.length === 0 ? (
                <View className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <Text className="text-slate-500 text-center">No tanks found</Text>
                </View>
            ) : (
                <View className="gap-3">
                    {tanksList.map((tank) => (
                        <TankCard key={tank.id} tank={tank} />
                    ))}
                </View>
            )}
        </Animated.View>
    );
});
