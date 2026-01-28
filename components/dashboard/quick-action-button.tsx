import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

interface QuickActionButtonProps {
  label: string;
  icon: string;
  color?: string;
  onPress?: () => void;
}

export const QuickActionButton = ({ label, icon, color = '#3b82f6', onPress }: QuickActionButtonProps) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="mb-4 w-[48%] flex-row items-center rounded-lg bg-slate-800 p-4 shadow-sm active:opacity-80"
    >
      <SymbolView 
        name={icon} 
        size={20} 
        tintColor={color}
        style={{ marginRight: 12 }}
      />
      <Text className="font-bold text-white text-sm">
        {label}
      </Text>
    </TouchableOpacity>
  );
};
