import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { Alert } from '../../utils/mock-data';

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

export const AlertBanner = ({ alert, onDismiss }: AlertBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to finish before calling onDismiss
    setTimeout(() => {
      onDismiss?.(alert.id);
    }, 300);
  };

  if (!isVisible) return null;

  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          bg: 'bg-red-900/20',
          border: 'border-red-500',
          icon: 'exclamationmark.triangle.fill',
          iconColor: '#ef4444',
          text: 'text-red-200',
          title: 'text-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-amber-900/20',
          border: 'border-amber-500',
          icon: 'exclamationmark.circle.fill',
          iconColor: '#f59e0b',
          text: 'text-amber-200',
          title: 'text-amber-100'
        };
      default:
        return {
          bg: 'bg-blue-900/20',
          border: 'border-blue-500',
          icon: 'info.circle.fill',
          iconColor: '#3b82f6',
          text: 'text-blue-200',
          title: 'text-blue-100'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <Animated.View 
      entering={FadeInDown.springify()}
      exiting={FadeOutUp}
      className={`mb-4 w-full flex-row items-start rounded-lg border-l-4 p-4 ${styles.bg} ${styles.border}`}
    >
      <View className="mr-3 mt-0.5">
        <SymbolView 
          name={styles.icon} 
          size={20} 
          tintColor={styles.iconColor}
        />
      </View>
      
      <View className="flex-1">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className={`font-bold ${styles.title}`}>
            {alert.title}
          </Text>
          <Text className="text-xs text-slate-400">
            {alert.timestamp}
          </Text>
        </View>
        <Text className={`text-sm ${styles.text}`}>
          {alert.message}
        </Text>
      </View>

      <TouchableOpacity 
        onPress={handleDismiss}
        className="ml-2 p-1"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <SymbolView 
          name="xmark" 
          size={14} 
          tintColor="#94a3b8"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};
