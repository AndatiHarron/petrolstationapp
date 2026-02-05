import React from 'react';
import { View, Text } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { SystemMetric } from './mock-data';

interface StatsRibbonProps {
    metrics: SystemMetric[];
}

export function StatsRibbon({ metrics }: StatsRibbonProps) {
    return (
        <View className="flex-row flex-wrap gap-4 mb-8">
            {metrics.map((metric, index) => {
                // Dynamic icon rendering
                const IconComponent = (LucideIcons as any)[metric.icon] || LucideIcons.Activity;
                const trendColor = metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-slate-400';

                return (
                    <View
                        key={index}
                        className="w-full md:flex-1 min-w-[200px] bg-slate-800 border border-slate-700/50 rounded-xl p-5 shadow-sm"
                    >
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                {metric.label}
                            </Text>
                            <View className="p-2 bg-slate-700/50 rounded-lg">
                                <IconComponent size={16} color="#94a3b8" />
                            </View>
                        </View>

                        <View className="mt-1">
                            <Text className="text-2xl font-bold text-white tracking-tight">
                                {metric.value}
                            </Text>
                            <Text className={`text-xs font-medium mt-1 ${trendColor}`}>
                                {metric.change}
                                <Text className="text-slate-500 font-normal"> from last month</Text>
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}
