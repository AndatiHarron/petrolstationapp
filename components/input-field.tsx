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
        <Text className="mb-2 text-xs font-bold text-gray-600 uppercase tracking-widest">
          {label}
        </Text>
        <View className="relative">
          <TextInput
            ref={ref}
            className={`h-14 w-full rounded-xl bg-gray-100 px-4 text-base text-black border ${error
                ? 'border-red-500 bg-red-500/10'
                : 'border-gray-300 focus:border-gray-400'
              } ${inputClassName ?? ''}`}
            placeholderTextColor="#9CA3AF" // Gray placeholder
            {...props}
          />
          {rightAccessory ? (
            <View className="absolute right-4 top-0 bottom-0 justify-center">
              {rightAccessory}
            </View>
          ) : null}
        </View>
        {error && (
          <Animated.Text
            entering={FadeIn}
            className="mt-1.5 text-xs font-semibold text-red-500"
          >
            {error}
          </Animated.Text>
        )}
      </Animated.View>
    );
  }
);
