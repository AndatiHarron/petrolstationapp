import React, { memo, useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';

interface SkeletonCardProps {
    variant: 'product' | 'tank' | 'customer' | 'lifting' | 'shift';
    style?: StyleProp<ViewStyle>;
}

export const SkeletonCard = memo(function SkeletonCard({ variant, style }: SkeletonCardProps) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
    }));

    if (variant === 'product') {
        return (
            <Animated.View
                style={[animatedStyle, { width: 140 }, style]}
                className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
            >
                <View className="h-3 w-16 bg-slate-700 rounded mb-2" />
                <View className="h-6 w-24 bg-slate-700 rounded mb-2" />
                <View className="h-3 w-12 bg-slate-700 rounded" />
            </Animated.View>
        );
    }

    if (variant === 'tank') {
        return (
            <Animated.View
                style={[animatedStyle, style]}
                className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
            >
                <View className="flex-row justify-between mb-2">
                    <View className="flex-1">
                        <View className="h-4 w-24 bg-slate-700 rounded mb-1" />
                        <View className="h-3 w-16 bg-slate-700 rounded" />
                    </View>
                    <View className="items-end">
                        <View className="h-4 w-20 bg-slate-700 rounded mb-1" />
                        <View className="h-3 w-14 bg-slate-700 rounded" />
                    </View>
                </View>
                <View className="h-3 bg-slate-700 rounded-full mt-2" />
                <View className="h-3 w-12 bg-slate-700 rounded mt-1 self-end" />
            </Animated.View>
        );
    }

    if (variant === 'customer') {
        return (
            <Animated.View
                style={[animatedStyle, { width: 160 }, style]}
                className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
            >
                <View className="bg-slate-700 w-10 h-10 rounded-full mb-2" />
                <View className="h-4 w-24 bg-slate-700 rounded mb-2" />
                <View className="h-3 w-20 bg-slate-700 rounded" />
            </Animated.View>
        );
    }

    if (variant === 'lifting') {
        return (
            <Animated.View
                style={[animatedStyle, style]}
                className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
            >
                <View className="flex-row justify-between mb-2">
                    <View className="flex-1">
                        <View className="h-5 w-32 bg-slate-700 rounded mb-2" />
                        <View className="h-3 w-20 bg-slate-700 rounded" />
                    </View>
                    <View className="h-6 w-20 bg-slate-700 rounded-full" />
                </View>
                <View className="flex-row justify-between items-center mt-3">
                    <View className="h-3 w-24 bg-slate-700 rounded" />
                    <View className="h-4 w-24 bg-slate-700 rounded" />
                </View>
            </Animated.View>
        );
    }

    if (variant === 'shift') {
        return (
            <Animated.View
                style={[animatedStyle, style]}
                className="bg-slate-800/70 rounded-3xl p-6 border border-slate-700/50 w-full"
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
    }

    return null;
});
