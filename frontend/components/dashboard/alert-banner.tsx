import React, { useState } from 'react';
import { AppIcon } from '../app-icon';
import { X } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
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
          bg: 'bg-accent-subtle',
          border: 'border-red-500',
          icon: 'exclamationmark.triangle.fill',
          iconColor: '#bf0a30',
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
          bg: 'bg-brand-subtle',
          border: 'border-brand',
          icon: 'info.circle.fill',
          iconColor: '#040273',
          text: 'text-white',
          title: 'text-white'
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
        <AppIcon name={styles.icon} size={20} color={styles.iconColor} />
      </View>
      
      <View className="flex-1">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className={`font-bold ${styles.title}`}>
            {alert.title}
          </Text>
          <Text className="text-xs text-ink-muted">
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
        <X size={14} color="#8b8b99" />
      </TouchableOpacity>
    </Animated.View>
  );
};
