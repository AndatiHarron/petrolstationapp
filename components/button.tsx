import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ title, loading, variant = 'primary', className, ...props }: ButtonProps) => {
  const baseStyles = "h-12 w-full items-center justify-center rounded-sm transition-opacity active:opacity-80";
  const variantStyles = variant === 'primary' 
    ? "bg-blue-600 shadow-sm" 
    : "bg-slate-200 border-2 border-slate-300";
  
  const textStyles = variant === 'primary'
    ? "text-white font-bold tracking-wide uppercase"
    : "text-slate-700 font-bold tracking-wide uppercase";

  return (
    <TouchableOpacity
      className={`${baseStyles} ${variantStyles} ${loading ? 'opacity-70' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#334155'} />
      ) : (
        <Text className={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
