import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { TankResource } from '@/features/api/model';

interface TankCardProps {
    tank: TankResource;
}

// Helper to calculate tank fill percentage
const getTankFillPercentage = (tank: TankResource) => {
    if (!tank.capacity_liters || tank.capacity_liters === 0) return 0;
    return Math.min(100, Math.round((tank.current_volume / tank.capacity_liters) * 100));
};

// Get fill color based on percentage
const getFillColor = (percentage: number) => {
    if (percentage < 20) return 'bg-accent';
    if (percentage < 40) return 'bg-amber-500';
    return 'bg-emerald-500';
};

export const TankCard = memo(function TankCard({ tank }: TankCardProps) {
    const fillPercent = getTankFillPercentage(tank);
    const fillColor = getFillColor(fillPercent);

    return (
        <View className="bg-surface rounded-xl p-4 border border-surface-border">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                    <Text className="text-ink font-bold" numberOfLines={2}>{tank.name}</Text>
                    <Text className="text-ink-muted text-xs">
                        {tank.product_name || 'Unknown Product'}
                    </Text>
                </View>
                <View className="items-end shrink-0">
                    <Text className="text-ink font-bold">
                        {tank.current_volume.toLocaleString()} L
                    </Text>
                    <Text className="text-ink-muted text-xs">
                        of {tank.capacity_liters.toLocaleString()} L
                    </Text>
                </View>
            </View>
            {/* Tank gauge */}
            <View className="h-3 bg-surface-border rounded-full overflow-hidden">
                <View
                    className={`h-full ${fillColor} rounded-full`}
                    style={{ width: `${fillPercent}%` }}
                />
            </View>
            <Text className="text-ink-muted text-xs mt-1 text-right">
                {fillPercent}% full
            </Text>
        </View>
    );
});
