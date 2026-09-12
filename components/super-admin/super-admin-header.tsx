import React from 'react';
import { View, Text } from 'react-native';

export function SuperAdminHeader() {
    const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <View className="gap-2 pb-6 pt-2">
            <Text className="text-ink-faint text-xs font-medium uppercase tracking-wider">
                {currentDate}
            </Text>

            <View>
                <View>
                    <Text className="text-ink text-2xl font-bold">Overview</Text>
                    <Text className="text-ink-muted mt-1 text-sm">
                        Manage organizations and admins
                    </Text>
                </View>
            </View>
        </View>
    );
}
