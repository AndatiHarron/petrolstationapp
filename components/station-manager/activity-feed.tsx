import React from 'react';
import { View, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { FlashList } from '@shopify/flash-list';
import { useAuditLogIndex } from '@/features/api/audit-log/audit-log';


import { AuditLogResource } from '@/features/api/model/auditLogResource';
import { AuditLogIndex200 } from '@/features/api/model';

export function ActivityFeed() {
    const { data: auditLogs, isPending: isAuditLogsPending, error } = useAuditLogIndex();

    const auditLogsResponse = auditLogs as unknown as AuditLogIndex200;

    // Type guard to ensure we have valid data
    const data = (auditLogsResponse?.data) || [];
    const meta = (auditLogsResponse?.meta) || null;

    const currentPage = meta?.current_page || 1;
    const lastPage = meta?.last_page || 1;

    // Single return to keep NativeWind CssInterop hook count stable across renders
    return (
        <View className="mt-8 mb-10 min-h-[300px]">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Recent Activity
                </Text>
                {!error && !isAuditLogsPending && (
                    <Text className="text-slate-500 text-xs">
                        Page {currentPage} of {lastPage}
                    </Text>
                )}
            </View>

            <View className="bg-slate-800 rounded-2xl overflow-hidden flex-1">
                {error ? (
                    <View className="p-4">
                        <Text className="text-slate-500">Error loading activity feed: {error.message}</Text>
                    </View>
                ) : isAuditLogsPending ? (
                    <View className="p-4 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <View key={i} className="flex-row items-center">
                                <View className="w-10 h-10 rounded-full bg-slate-700 mr-4" />
                                <View className="flex-1 space-y-2">
                                    <View className="h-4 bg-slate-700 rounded w-1/2" />
                                    <View className="h-3 bg-slate-700 rounded w-1/3" />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <FlashList<AuditLogResource>
                        data={data}
                        renderItem={({ item, index }) => {
                            const isLast = index === data.length - 1;
                            let icon = 'doc.text.fill';
                            let color = '#94a3b8';

                            const desc = item.description?.toLowerCase() || '';
                            if (desc.includes('payment') || desc.includes('sale')) {
                                icon = 'creditcard.fill';
                                color = '#10b981';
                            } else if (desc.includes('pump') || desc.includes('fuel')) {
                                icon = 'fuelpump.fill';
                                color = '#3b82f6';
                            } else if (desc.includes('alert') || desc.includes('error')) {
                                icon = 'exclamationmark.triangle.fill';
                                color = '#ef4444';
                            }

                            return (
                                <View className={`flex-row items-center p-4 ${!isLast ? 'border-b border-slate-700/50' : ''}`}>
                                    <View className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center mr-4">
                                        <SymbolView name={icon as any} size={18} tintColor={color} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-base" numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                        <Text className="text-slate-400 text-sm" numberOfLines={1}>
                                            {item.causer?.name || 'System'} • {item.causer?.role || 'N/A'}
                                        </Text>
                                    </View>
                                    <Text className="text-slate-500 text-xs font-semibold ml-2">
                                        {item.time_ago}
                                    </Text>
                                </View>
                            );
                        }}
                        ListEmptyComponent={
                            <View className="p-8 items-center">
                                <Text className="text-slate-500">No recent activity</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}
