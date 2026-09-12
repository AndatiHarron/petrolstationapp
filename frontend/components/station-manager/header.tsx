import React from 'react';
import { View, Text } from 'react-native';

interface StationManagerHeaderProps {
    isShiftActive?: boolean;
}

export function StationManagerHeader({ isShiftActive = false }: StationManagerHeaderProps) {
    const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <View className="gap-3 pb-6 pt-2">
            {/* Date owns a full row: sharing one with the controls squeezed it. */}
            <Text className="text-ink-faint text-xs font-medium uppercase tracking-wider">
                {currentDate}
            </Text>

            <View className="flex-row items-center justify-between gap-3">
                <Text className="text-ink flex-1 text-2xl font-bold" numberOfLines={1}>
                    {isShiftActive ? 'Active Shift' : 'Overview'}
                </Text>

                <View className="flex-row shrink-0 items-center gap-2">
                    <View
                        className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${
                            isShiftActive
                                ? 'border-emerald-600 bg-emerald-50'
                                : 'border-surface-border bg-surface-sunken'
                        }`}
                    >
                        <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: isShiftActive ? '#059669' : '#8b8b99' }}
                        />
                        <Text
                            className={`text-[10px] font-bold uppercase tracking-widest ${
                                isShiftActive ? 'text-emerald-700' : 'text-ink-faint'
                            }`}
                        >
                            {isShiftActive ? 'Open' : 'Off'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
