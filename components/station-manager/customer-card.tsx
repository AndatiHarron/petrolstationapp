import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { CustomerResource } from '@/features/api/model';

interface CustomerCardProps {
    customer: CustomerResource;
}

export const CustomerCard = memo(function CustomerCard({ customer }: CustomerCardProps) {
    return (
        <View
            className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50"
            style={{ width: 160 }}
        >
            <View className="bg-emerald-500/20 w-10 h-10 rounded-full items-center justify-center mb-2">
                <Text className="text-emerald-400 font-bold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text className="text-white font-bold" numberOfLines={1}>
                {customer.name}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
                Credit: Sh {customer.available_credit.toLocaleString()}
            </Text>
            {customer.current_balance > 0 && (
                <Text className="text-amber-400 text-xs">
                    Owes: Sh {customer.current_balance.toLocaleString()}
                </Text>
            )}
        </View>
    );
});
