import React from 'react';
import { View, Text } from 'react-native';
import { LogoutButton } from '@/components/logout-button';

export function AdminHeader() {
    const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <View className="gap-2 pb-6 pt-2">
            <Text className="text-ink-faint text-xs font-semibold uppercase tracking-wider">
                {currentDate}
            </Text>

            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                    <Text className="text-ink text-2xl font-bold">Business Intelligence</Text>
                    <Text className="text-ink-muted mt-1 text-sm">
                        Financial oversight and operational integrity
                    </Text>
                </View>

                <LogoutButton />
            </View>
        </View>
    );
}
