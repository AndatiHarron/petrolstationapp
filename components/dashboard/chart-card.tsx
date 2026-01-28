import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';

export const ChartCard = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [width, setWidth] = useState(0);

  // Mock data points (0-100 scale)
  const data = [45, 62, 38, 75, 55, 82, 68, 45, 62, 38, 75, 55];

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View className="mb-6 rounded-lg bg-slate-800 p-4 shadow-sm">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Sales Trend
        </Text>
        <View className="flex-row rounded-md bg-slate-700 p-1">
          {(['day', 'week', 'month'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              className={`rounded px-3 py-1 ${
                period === p ? 'bg-slate-600' : 'bg-transparent'
              }`}
            >
              <Text className={`text-xs font-medium capitalize ${
                period === p ? 'text-white' : 'text-slate-400'
              }`}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View 
        className="h-40 w-full flex-row items-end justify-between pt-4"
        onLayout={handleLayout}
      >
        {width > 0 && data.map((value, index) => (
          <View key={index} className="items-center" style={{ width: (width - 32) / data.length - 4 }}>
            <View 
              className="w-full rounded-t-sm bg-blue-500 opacity-80"
              style={{ height: `${value}%` }}
            />
          </View>
        ))}
      </View>
      
      <View className="mt-2 flex-row justify-between border-t border-slate-700 pt-2">
        <Text className="text-xs text-slate-500">00:00</Text>
        <Text className="text-xs text-slate-500">06:00</Text>
        <Text className="text-xs text-slate-500">12:00</Text>
        <Text className="text-xs text-slate-500">18:00</Text>
        <Text className="text-xs text-slate-500">23:59</Text>
      </View>
    </View>
  );
};
