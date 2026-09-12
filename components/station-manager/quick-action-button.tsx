import React from 'react';
import { AppIcon } from '../app-icon';
import { Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

interface QuickActionButtonProps {
  label: string;
  icon: string;
  color?: string;
  onPress?: () => void;
}

export const QuickActionButton = ({ label, icon, color = '#040273', onPress }: QuickActionButtonProps) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="mb-4 w-[48%] flex-row items-center rounded-lg bg-surface p-4 shadow-sm active:opacity-80"
    >
      <AppIcon name={icon} size={20} color={color} style={{ marginRight: 12 }} />
      <Text className="font-bold text-ink text-sm">
        {label}
      </Text>
    </TouchableOpacity>
  );
};
