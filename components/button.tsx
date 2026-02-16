import React from 'react';
import { Text, ActivityIndicator, Pressable, PressableProps, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
}

export const Button = ({ title, loading, variant = 'primary', style, onPress, className, ...props }: ButtonProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = (e: any) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    onPress?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return 'bg-amber-500 shadow-xl shadow-amber-500/20 border-transparent'; // Dashboard Amber
      case 'secondary':
        return 'bg-slate-800 border-slate-700 border';
      case 'outline':
        return 'bg-transparent border-slate-600 border-2';
      case 'ghost':
        return 'bg-transparent border-transparent';
      default:
        return 'bg-amber-500';
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return 'text-white';
      case 'secondary':
        return 'text-white';
      case 'outline':
        return 'text-white';
      case 'ghost':
        return 'text-slate-400';
      default:
        return 'text-white';
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={loading || props.disabled}
      className={`h-16 w-full items-center justify-center rounded-full ${getVariantStyle()} ${loading || props.disabled ? 'opacity-70' : ''} ${className}`}
      style={[animatedStyle, style as any]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#000' : '#fff'} />
      ) : (
        <Text
          className={`text-lg font-black uppercase tracking-wider ${getTextStyle()}`}
          style={{ paddingHorizontal: 2, textAlign: 'center' }}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
};
