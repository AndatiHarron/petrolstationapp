import React from 'react';
import { View, Text } from 'react-native';
import { useAuditLogIndex } from '../../../features/api/audit-log/audit-log';
import type { AuditLogIndex200, AuditLogResource } from '@/features/api/model';
import { Section, SectionEmpty } from './section';

function ActivityRowSkeleton() {
    return (
        <View className="gap-2 py-3">
            <View className="h-3 w-48 rounded bg-surface-border" />
            <View className="h-2 w-28 rounded bg-surface-border" />
        </View>
    );
}

export function RecentActivity({ index = 0 }: { index?: number }) {
    const { data: auditLogsResponse, isLoading, isError } = useAuditLogIndex();

    const auditLogs: AuditLogResource[] =
        (auditLogsResponse as unknown as AuditLogIndex200)?.data ?? [];
    const recentActivities = auditLogs.slice(0, 5);

    return (
        <Section title="Recent activity" subtitle="Audit trail" index={index}>
            {isLoading ? (
                <View>
                    {[1, 2, 3].map((i) => (
                        <ActivityRowSkeleton key={i} />
                    ))}
                </View>
            ) : isError ? (
                <SectionEmpty message="Could not load activity" />
            ) : recentActivities.length === 0 ? (
                <SectionEmpty message="Nothing recorded yet" />
            ) : (
                // A timeline rather than five stacked cards: these are one
                // sequence of events, and boxing each of them fought that.
                <View>
                    {recentActivities.map((log, position) => {
                        const isLast = position === recentActivities.length - 1;

                        return (
                            <View key={log.id} className="flex-row gap-3">
                                <View className="items-center pt-1.5">
                                    <View className="h-2 w-2 rounded-full bg-brand" />
                                    {!isLast ? (
                                        <View className="w-px flex-1 bg-surface-border" />
                                    ) : null}
                                </View>

                                <View className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-3.5'}`}>
                                    <Text className="text-ink text-[13px] font-medium" numberOfLines={2}>
                                        {log.description}
                                    </Text>
                                    <Text className="text-ink-faint mt-0.5 text-[11px]" numberOfLines={1}>
                                        {log.causer?.name ?? 'System'} &middot; {log.time_ago}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </Section>
    );
}
