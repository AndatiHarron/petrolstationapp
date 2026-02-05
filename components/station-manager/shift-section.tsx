import React, { memo, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
    FadeIn,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { useShiftIndex } from '@/features/api/shift/shift';
import type { ShiftIndex200, AuthenticationExceptionResponse } from '@/features/api/model';
import { StartShiftView } from './start-shift-view';
import { StationManagerHeader } from './header';

// Type guard for successful API response
function hasData<T extends { data: unknown }>(
    response: T | AuthenticationExceptionResponse | undefined
): response is T {
    return response !== undefined && 'data' in response;
}

// Skeleton component for shift section
const ShiftSkeleton = memo(function ShiftSkeleton() {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
    }));

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            style={animatedStyle}
            className="bg-slate-800/70 rounded-3xl p-6 mb-6 border border-slate-700/50"
        >
            {/* Header skeleton */}
            <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                    <View className="bg-slate-700 w-12 h-12 rounded-xl mr-3" />
                    <View>
                        <View className="h-5 w-28 bg-slate-700 rounded mb-2" />
                        <View className="h-3 w-36 bg-slate-700 rounded" />
                    </View>
                </View>
                <View className="bg-slate-700 px-4 py-2 rounded-full w-20 h-7" />
            </View>

            {/* Details skeleton */}
            <View className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-6">
                <View className="flex-row justify-between items-center mb-3">
                    <View className="h-3 w-16 bg-slate-700 rounded" />
                    <View className="h-4 w-24 bg-slate-700 rounded" />
                </View>
                <View className="flex-row justify-between items-center">
                    <View className="h-3 w-16 bg-slate-700 rounded" />
                    <View className="h-4 w-20 bg-slate-700 rounded" />
                </View>
            </View>

            {/* Button skeleton */}
            <View className="bg-slate-700 h-14 w-full rounded-xl" />
        </Animated.View>
    );
});

interface ShiftSectionProps {
    onShiftChange?: (isActive: boolean) => void;
}

export const ShiftSection = memo(function ShiftSection({ onShiftChange }: ShiftSectionProps) {
    const { data: activeShift, isLoading } = useShiftIndex({
        query: {
            queryKey: ['activeShift'],
        },
    });

    // Extract shift data using type guard
    const shiftResource = React.useMemo(() => {
        const res = activeShift as unknown as ShiftIndex200 | AuthenticationExceptionResponse | undefined;
        return hasData<ShiftIndex200>(res) ? res.data : undefined;
    }, [activeShift]);

    // Notify parent of shift status changes
    React.useEffect(() => {
        onShiftChange?.(!!shiftResource);
    }, [shiftResource, onShiftChange]);

    return (
        <Animated.View entering={FadeIn.duration(500).delay(100)}>
            <StationManagerHeader isShiftActive={!!shiftResource} />
            {isLoading ? (
                <ShiftSkeleton />
            ) : (
                <StartShiftView activeShift={shiftResource} />
            )}
        </Animated.View>
    );
});
