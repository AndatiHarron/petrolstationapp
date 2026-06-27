import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { MOCK_VARIANCE_DATA, MOCK_WET_STOCK } from './mock-data';

export function InventorySection() {
    const lineData = MOCK_VARIANCE_DATA.map(item => ({
        value: item.value,
        label: item.label,
        dataPointText: String(item.value),
        dataPointTextColor: item.value >= 0 ? '#10b981' : '#f87171',
        textColor: '#94a3b8'
    }));

    return (
        <View className="flex gap-6 mb-8">
            <View className="flex-[2] bg-gray-100 border border-gray-300 rounded-xl p-6 shadow-sm overflow-hidden">
                <View className="mb-6">
                    <Text className="text-white font-bold text-lg">Fuel Loss/Gain Trend</Text>
                    <Text className="text-slate-500 text-xs">Physical vs. Book Stock Variance (Liters)</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} className="pb-2">
                    <View className="pr-4">
                        <LineChart
                            data={lineData}
                            color="#f97316"
                            thickness={3}
                            dataPointsColor="#f97316"
                            xAxisColor="#334155"
                            yAxisColor="#334155"
                            width={600}
                            yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10 }}
                            height={200}
                            spacing={50}
                            initialSpacing={20}
                            rulesColor="#334155"
                            rulesType="solid"
                            hideRules={false}
                            yAxisOffset={0}
                        />
                    </View>
                </ScrollView>
            </View>

            {/* Wet Stock Overview */}
            <View className="flex-1 bg-gray-100 border border-gray-300 rounded-xl p-6 shadow-sm">
                <View className="mb-6">
                    <Text className="text-white font-bold text-lg">Wet Stock Levels</Text>
                    <Text className="text-slate-500 text-xs">Current Tank Readings</Text>
                </View>

                <View className="flex-1 flex-row justify-around items-end pb-4">
                    {MOCK_WET_STOCK.map((tank, index) => {
                        // Calculate height percentage for visualization (max 150px height)
                        const height = Math.max(20, tank.level * 180);
                        const color = tank.level > 0.3 ? 'bg-blue-500' : 'bg-red-500';

                        return (
                            <View key={index} className="items-center gap-2">
                                <View className="w-14 items-center justify-end">
                                    <Text className="text-white font-bold text-xs mb-1 absolute bottom-full pb-1">
                                        {Math.round(tank.level * 100)}%
                                    </Text>
                                    <View className={`w-14 rounded-t-lg bg-slate-700/30 overflow-hidden relative h-[180px] justify-end border border-slate-600`}>
                                        <View style={{ height }} className={`w-full ${color} opacity-80`} />
                                    </View>
                                </View>
                                <Text className="text-slate-400 text-[10px] font-semibold text-center w-20">
                                    {tank.tank}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}
