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
                const trendColor = metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-accent' : 'text-ink-muted';

                return (
                    <View
                        key={index}
                        className="w-full md:flex-1 min-w-[200px] bg-surface border border-surface-border rounded-xl p-5 shadow-sm"
                    >
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-ink-muted text-xs font-semibold uppercase tracking-wider">
                                {metric.label}
                            </Text>
                            <View className="p-2 bg-surface-border rounded-lg">
                                <IconComponent size={16} color="#8b8b99" />
                            </View>
                        </View>

                        <View className="mt-1">
                            <Text className="text-2xl font-bold text-ink tracking-tight">
                                {metric.value}
                            </Text>
                            <Text className={`text-xs font-medium mt-1 ${trendColor}`}>
                                {metric.change}
                                <Text className="text-ink-muted font-normal"> from last month</Text>
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}
