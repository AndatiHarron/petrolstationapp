import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  delay?: number;
  className?: string; // Add className prop for flexibility
}

export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, style, delay = 0, className, ...props }, ref) => {
    return (
      <Animated.View
        entering={FadeInDown.delay(delay).duration(400).springify()}
        className={`mb-5 w-full ${className}`}
        style={style}
      >
        <Text className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </Text>
        <TextInput
          ref={ref}
          className={`h-14 w-full rounded-2xl bg-slate-900/50 px-4 text-base text-white border ${error
              ? 'border-red-500 bg-red-500/10'
              : 'border-slate-700/50 focus:border-amber-500'
            }`}
          placeholderTextColor="#64748b" // Slate 500
          {...props}
        />
        {error && (
          <Animated.Text
            entering={FadeIn}
            className="mt-1.5 text-xs font-medium text-red-400"
          >
            {error}
          </Animated.Text>
        )}
      </Animated.View>
    );
  }
);
