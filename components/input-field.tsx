import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <View className="mb-4 w-full">
        <Text className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-600">
          {label}
        </Text>
        <TextInput
          ref={ref}
          className={`h-12 w-full rounded-sm border-2 bg-white px-4 text-base text-slate-900 transition-colors focus:border-blue-600 ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${className}`}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
      </View>
    );
  }
);
