import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react-native';
import { MOCK_FINANCIALS } from './mock-data';

export function FinancialSection() {
    const { netProfit, taxLiability } = MOCK_FINANCIALS;

    return (
        <View className="flex-row flex-wrap gap-6 mb-8">
            {/* P&L Card */}
            <View className="flex-1 min-w-[300px] bg-slate-800 border border-slate-700/50 rounded-xl p-6 shadow-sm">
                <View className="flex-row justify-between items-start mb-4">
                    <View>
                        <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Net Profit</Text>
                        <Text className="text-slate-500 text-[10px] font-medium">Income - (COGS + OpEx + Tax)</Text>
                    </View>
                    <View className="w-10 h-10 bg-emerald-500/10 rounded-full items-center justify-center">
                        <DollarSign size={20} color="#10b981" />
                    </View>
                </View>

                <View className="flex-row items-baseline gap-3">
                    <Text className="text-4xl font-black text-white tracking-tight">{netProfit.value}</Text>
                    <View className="flex-row items-center bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <TrendingUp size={12} color="#10b981" />
                        <Text className="text-emerald-500 text-xs font-bold ml-1">{netProfit.trend}</Text>
                    </View>
                </View>
                <Text className="text-slate-500 text-xs mt-2">Compared to last month</Text>
            </View>

            {/* Tax Liability Card */}
            <View className="flex-1 min-w-[300px] bg-slate-800 border border-slate-700/50 rounded-xl p-6 shadow-sm">
                <View className="flex-row justify-between items-start mb-6">
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tax Liability (VAT)</Text>
                    <View className="w-10 h-10 bg-amber-500/10 rounded-full items-center justify-center">
                        <Receipt size={20} color="#f59e0b" />
                    </View>
                </View>

                <View className="flex-row justify-between items-end">
                    <View>
                        <Text className="text-slate-500 text-xs mb-1">Net Payable</Text>
                        <Text className="text-3xl font-bold text-white tracking-tight">{taxLiability.netPayable}</Text>
                        <Text className="text-amber-400 text-xs font-medium mt-1">Due in 5 days</Text>
                    </View>

                    <View className="items-end gap-1">
                        <View className="flex-row justify-between w-32">
                            <Text className="text-slate-500 text-xs">Collected</Text>
                            <Text className="text-slate-300 text-xs font-semibold">{taxLiability.vatCollected}</Text>
                        </View>
                        <View className="flex-row justify-between w-32">
                            <Text className="text-slate-500 text-xs">Paid (Input)</Text>
                            <Text className="text-slate-300 text-xs font-semibold">{taxLiability.vatPaid}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}
