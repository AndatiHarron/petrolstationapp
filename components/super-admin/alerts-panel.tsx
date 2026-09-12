import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { AlertTriangle, Info, XCircle } from 'lucide-react-native';
import { Alert } from './mock-data';

interface AlertsPanelProps {
    alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
    return (
        <View className="w-80 bg-surface border-l border-surface-border h-full hidden xl:flex">
            <View className="p-5 border-b border-surface-border">
                <Text className="text-ink font-bold text-base">Recent Alerts</Text>
                <Text className="text-ink-muted text-xs mt-1">System-wide notifications</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {alerts.map((alert) => {
                    let Icon = Info;
                    let iconColor = '#040273';
                    let bg = 'bg-brand-subtle';

                    if (alert.type === 'critical') {
                        Icon = XCircle;
                        iconColor = '#bf0a30'; // red-400
                        bg = 'bg-accent-subtle';
                    } else if (alert.type === 'warning') {
                        Icon = AlertTriangle;
                        iconColor = '#fbbf24'; // amber-400
                        bg = 'bg-amber-500/10';
                    }

                    return (
                        <View key={alert.id} className="mb-4 bg-surface-sunken border border-surface-border rounded-lg p-3">
                            <View className="flex-row gap-3">
                                <View className={`mt-0.5 w-6 h-6 rounded-md items-center justify-center ${bg}`}>
                                    <Icon size={14} color={iconColor} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-ink text-sm leading-5 mb-1.5">
                                        {alert.message}
                                    </Text>
                                    <Text className="text-ink-muted text-[10px] font-medium uppercase tracking-wide">
                                        {alert.timestamp}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}
