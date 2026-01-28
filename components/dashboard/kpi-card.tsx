import React, { useEffect } from 'react';
import { View, Text, PlatformColor } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { KPI } from '../../utils/mock-data';

interface KPICardProps {
  kpi: KPI;
  index: number;
}

export const KPICard = ({ kpi, index }: KPICardProps) => {
  const isPositive = kpi.trend > 0;
  const isNeutral = kpi.trend === 0;
  
  // Determine color based on KPI type and trend
  // For discrepancies, negative trend is good (green), positive is bad (red)
  let trendColor = 'text-slate-400';
  let trendIcon = 'minus';
  
  if (!isNeutral) {
    if (kpi.type === 'discrepancy') {
      trendColor = isPositive ? 'text-red-500' : 'text-emerald-500';
    } else {
      trendColor = isPositive ? 'text-emerald-500' : 'text-red-500';
    }
    trendIcon = isPositive ? 'arrow.up.right' : 'arrow.down.right';
  }

  const getBorderColor = () => {
    switch (kpi.type) {
      case 'revenue': return 'border-l-emerald-500';
      case 'inventory': return 'border-l-amber-500';
      case 'discrepancy': return 'border-l-red-500';
      default: return 'border-l-blue-500';
    }
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(index * 100).springify()}
      className={`mb-4 w-[48%] rounded-lg bg-slate-800 p-4 shadow-sm border-l-4 ${getBorderColor()}`}
    >
      <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {kpi.label}
      </Text>
      
      <Text className="mb-2 font-mono text-xl font-bold text-white">
        {kpi.value}
      </Text>
      
      <View className="flex-row items-center">
        {!isNeutral && (
          <SymbolView 
            name={trendIcon} 
            size={12} 
            tintColor={kpi.type === 'discrepancy' ? (isPositive ? '#ef4444' : '#10b981') : (isPositive ? '#10b981' : '#ef4444')}
            style={{ marginRight: 4 }}
          />
        )}
        <Text className={`text-xs font-medium ${trendColor}`}>
          {isNeutral ? '-' : `${Math.abs(kpi.trend)}%`}
        </Text>
        <Text className="ml-1 text-xs text-slate-500">vs last week</Text>
      </View>
    </Animated.View>
  );
};
