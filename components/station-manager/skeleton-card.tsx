import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';

interface SkeletonCardProps {
    variant: 'product' | 'tank' | 'customer';
}

export const SkeletonCard = memo(function SkeletonCard({ variant }: SkeletonCardProps) {
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
                style={[animatedStyle, { width: 140 }]}
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
                style={animatedStyle}
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

    // customer variant
    return (
        <Animated.View
            style={[animatedStyle, { width: 160 }]}
            className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
        >
            <View className="bg-slate-700 w-10 h-10 rounded-full mb-2" />
            <View className="h-4 w-24 bg-slate-700 rounded mb-2" />
            <View className="h-3 w-20 bg-slate-700 rounded" />
        </Animated.View>
    );
});
