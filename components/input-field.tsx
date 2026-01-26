import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  delay?: number;
}

export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, style, delay = 0, ...props }, ref) => {
    return (
      <Animated.View 
        entering={FadeInDown.delay(delay).duration(400).springify()} 
        style={[styles.container, style]}
      >
        <Text style={styles.label}>
          {label}
        </Text>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            error ? styles.inputError : styles.inputDefault
          ]}
          placeholderTextColor="#64748b" // Slate 500
          {...props}
        />
        {error && (
          <Animated.Text 
            entering={FadeIn} 
            style={styles.errorText}
          >
            {error}
          </Animated.Text>
        )}
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8', // Slate 400
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    height: 52,
    width: '100%',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#0f172a', // Slate 900
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF', // White
    borderWidth: 1,
  },
  inputDefault: {
    borderColor: '#334155', // Slate 700
  },
  inputError: {
    borderColor: '#ef4444', // Red 500
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red 500 with opacity
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: '#f87171', // Red 400
    fontWeight: '500',
  },
});
