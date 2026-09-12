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
                style={[animatedStyle, { minWidth: 150 }, style]}
                className="bg-surface rounded-xl p-4 border border-surface-border"
            >
                <View className="h-3 w-16 bg-surface-border rounded mb-2" />
                <View className="h-6 w-24 bg-surface-border rounded mb-2" />
                <View className="h-3 w-12 bg-surface-border rounded" />
            </Animated.View>
        );
    }

    if (variant === 'tank') {
        return (
            <Animated.View
                style={[animatedStyle, style]}
                className="bg-surface rounded-xl p-4 border border-surface-border"
            >
                <View className="flex-row justify-between mb-2">
                    <View className="flex-1">
                        <View className="h-4 w-24 bg-surface-border rounded mb-1" />
                        <View className="h-3 w-16 bg-surface-border rounded" />
                    </View>
                    <View className="items-end">
                        <View className="h-4 w-20 bg-surface-border rounded mb-1" />
                        <View className="h-3 w-14 bg-surface-border rounded" />
                    </View>
                </View>
                <View className="h-3 bg-surface-border rounded-full mt-2" />
                <View className="h-3 w-12 bg-surface-border rounded mt-1 self-end" />
            </Animated.View>
        );
    }

    if (variant === 'customer') {
        return (
            <Animated.View
                style={[animatedStyle, { minWidth: 160 }, style]}
                className="bg-surface rounded-xl p-4 border border-surface-border"
            >
                <View className="bg-surface-border w-10 h-10 rounded-full mb-2" />
                <View className="h-4 w-24 bg-surface-border rounded mb-2" />
                <View className="h-3 w-20 bg-surface-border rounded" />
            </Animated.View>
        );
    }

    if (variant === 'lifting') {
        return (
            <Animated.View
                style={[animatedStyle, style]}
                className="bg-surface rounded-xl p-4 border border-surface-border"
            >
                <View className="flex-row justify-between mb-2">
                    <View className="flex-1">
                        <View className="h-5 w-32 bg-surface-border rounded mb-2" />
                        <View className="h-3 w-20 bg-surface-border rounded" />
                    </View>
                    <View className="h-6 w-20 bg-surface-border rounded-full" />
                </View>
                <View className="flex-row justify-between items-center mt-3">
                    <View className="h-3 w-24 bg-surface-border rounded" />
                    <View className="h-4 w-24 bg-surface-border rounded" />
                </View>
            </Animated.View>
        );
    }

    if (variant === 'shift') {
        return (
            <Animated.View
                style={[animatedStyle, style]}
                className="bg-surface rounded-3xl p-6 border border-surface-border w-full"
            >
                {/* Header skeleton */}
                <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-row items-center">
                        <View className="bg-surface-border w-12 h-12 rounded-xl mr-3" />
                        <View>
                            <View className="h-5 w-28 bg-surface-border rounded mb-2" />
                            <View className="h-3 w-36 bg-surface-border rounded" />
                        </View>
                    </View>
                    <View className="bg-surface-border px-4 py-2 rounded-full w-20 h-7" />
                </View>

                {/* Details skeleton */}
                <View className="bg-surface-sunken rounded-xl p-4 border border-surface-border mb-6">
                    <View className="flex-row justify-between items-center mb-3">
                        <View className="h-3 w-16 bg-surface-border rounded" />
                        <View className="h-4 w-24 bg-surface-border rounded" />
                    </View>
                    <View className="flex-row justify-between items-center">
                        <View className="h-3 w-16 bg-surface-border rounded" />
                        <View className="h-4 w-20 bg-surface-border rounded" />
                    </View>
                </View>

                {/* Button skeleton */}
                <View className="bg-surface-border h-14 w-full rounded-xl" />
            </Animated.View>
        );
    }

    return null;
});
