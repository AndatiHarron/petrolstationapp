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
      case 'secondary':
        return 'border-transparent';
      case 'outline':
        return 'bg-transparent border';
      case 'ghost':
        return 'bg-transparent border-transparent';
      default:
        return '';
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return '#040273';
      case 'outline':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return '#040273';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'outline':
        return '#040273';
      default:
        return 'transparent';
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return 'text-white';
      case 'secondary':
        return 'text-white';
      case 'outline':
        return 'text-black';
      case 'ghost':
        return 'text-ink-muted';
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
      className={`h-12 w-full items-center justify-center rounded-xl ${getVariantStyle()} ${loading || props.disabled ? 'opacity-70' : ''} ${className}`}
      style={[animatedStyle, { backgroundColor: getBackgroundColor(), borderColor: getBorderColor(), borderWidth: variant === 'outline' ? 1 : 0 }, style as any]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#000' : '#fff'} />
      ) : (
        <Text
          className={`text-sm font-bold ${getTextStyle()}`}
          style={{ paddingHorizontal: 2, textAlign: 'center' }}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
};
