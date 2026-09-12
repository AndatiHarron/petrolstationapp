import React from 'react';
import { AppIcon } from '../app-icon';
import { View, Text } from 'react-native';
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
        <View className="mt-8 mb-10">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-ink-muted text-xs font-bold uppercase tracking-widest">
                    Recent Activity
                </Text>
                {!error && !isAuditLogsPending && (
                    <Text className="text-ink-muted text-xs">
                        Page {currentPage} of {lastPage}
                    </Text>
                )}
            </View>

            {/*
              Rendered as a plain list rather than a FlashList: this sits inside the
              dashboard's parent ScrollView, where a virtualised list has no bounded
              height. It was previously pinned to 300px with overflow-hidden, which
              silently cropped every row past the third.
            */}
            <View className="bg-surface rounded-2xl border border-surface-border">
                {error ? (
                    <View className="p-4">
                        <Text className="text-ink-muted">Error loading activity feed: {error.message}</Text>
                    </View>
                ) : isAuditLogsPending ? (
                    <View className="p-4 gap-4">
                        {[1, 2, 3].map((i) => (
                            <View key={i} className="flex-row items-center">
                                <View className="w-10 h-10 rounded-full bg-surface-border mr-4" />
                                <View className="flex-1 gap-2">
                                    <View className="h-4 bg-surface-border rounded w-1/2" />
                                    <View className="h-3 bg-surface-border rounded w-1/3" />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : data.length === 0 ? (
                    <View className="p-8 items-center">
                        <Text className="text-ink-muted">No recent activity</Text>
                    </View>
                ) : (
                    data.map((item: AuditLogResource, index: number) => {
                        const isLast = index === data.length - 1;
                        let icon = 'doc.text.fill';
                        let color = '#8b8b99';

                        const desc = item.description?.toLowerCase() || '';
                        if (desc.includes('payment') || desc.includes('sale')) {
                            icon = 'creditcard.fill';
                            color = '#10b981';
                        } else if (desc.includes('pump') || desc.includes('fuel')) {
                            icon = 'fuelpump.fill';
                            color = '#040273';
                        } else if (desc.includes('alert') || desc.includes('error')) {
                            icon = 'exclamationmark.triangle.fill';
                            color = '#bf0a30';
                        }

                        return (
                            <View
                                key={item.id ?? index}
                                className={`flex-row items-start p-4 ${!isLast ? 'border-b border-surface-border' : ''}`}
                            >
                                <View className="w-10 h-10 rounded-full bg-surface-sunken items-center justify-center mr-3">
                                    <AppIcon name={icon as any} size={18} color={color} />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className="text-ink font-bold text-base">
                                        {item.description}
                                    </Text>
                                    <Text className="text-ink-muted text-sm mt-0.5">
                                        {item.causer?.name || 'System'} • {item.causer?.role || 'N/A'}
                                    </Text>
                                </View>
                                <Text className="text-ink-faint text-xs font-semibold ml-2 shrink-0">
                                    {item.time_ago}
                                </Text>
                            </View>
                        );
                    })
                )}
            </View>
        </View>
    );
}
