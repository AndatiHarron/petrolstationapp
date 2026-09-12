import React from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay } from 'react-native-reanimated';
import { StatusIndicator as StatusIndicatorType } from '../../utils/mock-data';

interface StatusIndicatorProps {
  indicator: StatusIndicatorType;
  index: number;
}

export const StatusIndicator = ({ indicator, index }: StatusIndicatorProps) => {
  const getStatusColor = () => {
    switch (indicator.status) {
      case 'operational': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-accent';
      default: return 'bg-slate-500';
    }
  };

  const getStatusText = () => {
    switch (indicator.status) {
      case 'operational': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'critical': return 'text-accent';
      default: return 'text-ink-muted';
    }
  };

  // Pulse animation for warning/critical states
  const PulseDot = () => {
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: withDelay(
        index * 200,
        withRepeat(
          withSequence(
            withTiming(0.4, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          true
        )
      ),
    }));

    return (
      <Animated.View 
        className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`}
        style={indicator.status !== 'operational' ? animatedStyle : undefined}
      />
    );
  };

  return (
    <View className="mb-3 flex-row items-center justify-between rounded-md bg-surface px-4 py-3">
      <View className="flex-row items-center">
        <PulseDot />
        <Text className="ml-3 font-medium text-ink">
          {indicator.label}
        </Text>
      </View>
      
      <View className="flex-row items-center">
        {indicator.value && (
          <Text className="mr-3 font-mono text-sm font-bold text-ink">
            {indicator.value}
          </Text>
        )}
        <Text className={`text-xs font-bold uppercase tracking-wider ${getStatusText()}`}>
          {indicator.status}
        </Text>
      </View>
    </View>
  );
};
