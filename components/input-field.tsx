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
        <Text className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </Text>
        <TextInput
          ref={ref}
          className={`h-14 w-full rounded-xl bg-slate-800 px-4 text-base text-white border ${error
              ? 'border-red-500 bg-red-500/10'
              : 'border-transparent focus:border-slate-600'
            }`}
          placeholderTextColor="#64748b" // Slate 500
          {...props}
        />
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
