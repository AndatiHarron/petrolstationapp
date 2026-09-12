import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { CustomerResource } from '@/features/api/model';

interface CustomerCardProps {
    customer: CustomerResource;
}

export const CustomerCard = memo(function CustomerCard({ customer }: CustomerCardProps) {
    return (
        <View
            className="bg-surface rounded-xl p-4 border border-surface-border"
            style={{ minWidth: 160, maxWidth: 220 }}
        >
            <View className="bg-emerald-50 w-10 h-10 rounded-full items-center justify-center mb-2">
                <Text className="text-emerald-700 font-bold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text className="text-ink font-bold" numberOfLines={2}>
                {customer.name}
            </Text>
            <Text className="text-ink-muted text-xs mt-1">
                Credit: Sh {customer.available_credit.toLocaleString()}
            </Text>
            {customer.current_balance > 0 && (
                <Text className="text-amber-700 text-xs mt-0.5">
                    Owes: Sh {customer.current_balance.toLocaleString()}
                </Text>
            )}
        </View>
    );
});
