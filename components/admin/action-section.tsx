import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, Check, X, AlertCircle } from 'lucide-react-native';
import { MOCK_DEBTORS, MOCK_APPROVALS } from './mock-data';

export function ActionSection() {
    return (
        <View className="flex-row flex-wrap gap-6">
            {/* Debtors Aging Report */}
            <View className="flex-1 min-w-[300px] bg-surface border border-surface-border rounded-xl p-6 shadow-sm">
                <View className="mb-4 flex-row justify-between items-center">
                    <View>
                        <Text className="text-ink font-bold text-lg">Debtors Aging</Text>
                        <Text className="text-ink-muted text-xs">Outstanding Credit</Text>
                    </View>
                    <Pressable>
                        <Text className="text-orange-500 text-xs font-bold">View All</Text>
                    </Pressable>
                </View>

                <View className="gap-3">
                    {MOCK_DEBTORS.map((debtor, index) => (
                        <View key={index} className="flex-row items-center justify-between p-3 bg-surface-sunken rounded-lg border border-surface-border">
                            <View>
                                <Text className="text-ink font-medium text-sm">{debtor.name}</Text>
                                <Text className="text-accent text-xs font-semibold mt-0.5">{debtor.aging} Overdue</Text>
                            </View>
                            <Text className="text-ink font-bold">{debtor.amount}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Pending Approvals */}
            <View className="flex-1 min-w-[300px] bg-surface border border-surface-border rounded-xl p-6 shadow-sm">
                <View className="mb-4 flex-row justify-between items-center">
                    <View>
                        <Text className="text-ink font-bold text-lg">Pending Approvals</Text>
                        <Text className="text-ink-muted text-xs">Authorize Requests</Text>
                    </View>
                    <View className="bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                        <Text className="text-orange-500 text-xs font-bold">3 Pending</Text>
                    </View>
                </View>

                <View className="gap-3">
                    {MOCK_APPROVALS.map((item) => (
                        <View key={item.id} className="flex-row items-center justify-between p-3 bg-surface-sunken rounded-lg border border-surface-border">
                            <View className="flex-1">
                                <Text className="text-ink font-medium text-sm truncate">{item.request}</Text>
                                <View className="flex-row items-center mt-1 gap-2">
                                    <Text className="text-ink-muted text-xs">{item.user}</Text>
                                    <View className="w-1 h-1 rounded-full bg-slate-600" />
                                    <Text className="text-ink-muted text-xs">{item.time}</Text>
                                </View>
                            </View>
                            <View className="flex-row gap-2 ml-2">
                                <Pressable className="p-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                    <Check size={14} color="#10b981" />
                                </Pressable>
                                <Pressable className="p-1.5 bg-accent-subtle rounded-md border border-accent/20">
                                    <X size={14} color="#bf0a30" />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}
