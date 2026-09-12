import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  delay?: number;
  className?: string; // Add className prop for flexibility
  inputClassName?: string;
  rightAccessory?: React.ReactNode;
}

export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, style, delay = 0, className, inputClassName, rightAccessory, ...props }, ref) => {
    return (
      <Animated.View
        entering={FadeInDown.delay(delay).duration(400).springify()}
        className={`mb-5 w-full ${className}`}
        style={style}
      >
        <Text className="text-ink-muted mb-1.5 text-[11px] font-semibold">
          {label}
        </Text>
        <View className="relative">
          <TextInput
            ref={ref}
            className={`text-ink h-12 w-full rounded-xl border bg-surface px-3.5 text-[15px] ${error
                ? 'border-accent bg-accent-subtle'
                : 'border-surface-border focus:border-brand'
              } ${inputClassName ?? ''}`}
            placeholderTextColor="#8b8b99"
            {...props}
          />
          {rightAccessory ? (
            <View className="absolute bottom-0 right-3.5 top-0 justify-center">
              {rightAccessory}
            </View>
          ) : null}
        </View>
        {error && (
          <Animated.Text
            entering={FadeIn}
            className="mt-1.5 text-xs font-semibold text-accent"
          >
            {error}
          </Animated.Text>
        )}
      </Animated.View>
    );
  }
);
