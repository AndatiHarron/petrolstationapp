import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ title, loading, variant = 'primary', style, onPress, ...props }: ButtonProps) => {
  const handlePress = (e: any) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        loading && styles.loading,
        style
      ]}
      disabled={loading || props.disabled}
      onPress={handlePress}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#94a3b8'} />
      ) : (
        <Text style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textSecondary]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  primary: {
    backgroundColor: '#f59e0b', // Amber 500
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
  },
  secondary: {
    backgroundColor: '#334155', // Slate 700
    borderWidth: 1,
    borderColor: '#475569', // Slate 600
  },
  loading: {
    opacity: 0.7,
  },
  text: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#e2e8f0', // Slate 200
  },
});
