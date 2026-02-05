import React from 'react';
import { View, Text } from 'react-native';
import { useAuditLogIndex } from '../../../features/api/audit-log/audit-log';
import type { AuditLogIndex200, AuditLogResource } from '@/features/api/model';

// Skeleton loader for a single activity row
function ActivityRowSkeleton() {
    return (
        <View className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
            <View className="h-4 w-48 bg-slate-700 rounded mb-2 animate-pulse" />
            <View className="flex-row items-center gap-2">
                <View className="h-2 w-16 bg-slate-700 rounded animate-pulse" />
                <View className="w-1 h-1 rounded-full bg-slate-600" />
                <View className="h-2 w-24 bg-slate-700 rounded animate-pulse" />
            </View>
        </View>
    );
}

export function RecentActivity() {
    const { data: auditLogsResponse, isLoading, isError } = useAuditLogIndex();

    // Extract data safely - the hook returns { data: AuditLogIndex200 } structure
    const auditLogs: AuditLogResource[] = (auditLogsResponse as unknown as AuditLogIndex200)?.data ?? [];
    const recentActivities = auditLogs.slice(0, 5);

    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
            <View className="mb-4">
                <Text className="text-white font-bold text-lg">Recent Activity</Text>
                <Text className="text-slate-500 text-xs">Audit trail</Text>
            </View>

            {isLoading ? (
                <View className="gap-2">
                    <ActivityRowSkeleton />
                    <ActivityRowSkeleton />
                    <ActivityRowSkeleton />
                    <ActivityRowSkeleton />
                    <ActivityRowSkeleton />
                </View>
            ) : isError ? (
                <View className="items-center py-8">
                    <Text className="text-slate-500">Error loading recent activity</Text>
                </View>
            ) : recentActivities.length > 0 ? (
                <View className="gap-2">
                    {recentActivities.map((log) => (
                        <View key={log.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                            <Text className="text-slate-300 text-sm font-medium">{log.description}</Text>
                            <View className="flex-row items-center mt-1 gap-2">
                                <Text className="text-slate-500 text-xs">
                                    {log.causer?.name ?? 'System'}
                                </Text>
                                <View className="w-1 h-1 rounded-full bg-slate-600" />
                                <Text className="text-slate-500 text-xs">
                                    {log.time_ago}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View className="items-center py-8">
                    <Text className="text-slate-500">No recent activity</Text>
                </View>
            )}
        </View>
    );
}
