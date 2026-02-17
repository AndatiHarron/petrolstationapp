import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, Modal, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuditLogIndex, useAuditLogShow } from '../../features/api/audit-log/audit-log';
import type { AuditLogIndex200, AuditLogResource } from '@/features/api/model';
import { useTutorial } from '@/components/tutorial/use-tutorial';

// Skeleton loader for a single audit log row
function AuditLogSkeleton() {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="h-4 w-3/4 bg-slate-700 rounded mb-2 animate-pulse" />
            <View className="flex-row items-center gap-2 mt-2">
                <View className="h-3 w-20 bg-slate-700 rounded animate-pulse" />
                <View className="w-1 h-1 rounded-full bg-slate-600" />
                <View className="h-3 w-32 bg-slate-700 rounded animate-pulse" />
            </View>
        </View>
    );
}

// Memoized list item component following React Native best practices
const AuditLogItem = React.memo(({
    id,
    description,
    causerName,
    timeAgo,
    subjectType,
    onPress
}: {
    id: string;
    description: string;
    causerName: string;
    timeAgo: string;
    subjectType: string;
    onPress: (id: string) => void;
}) => {
    const handlePress = useCallback(() => {
        onPress(id);
    }, [id, onPress]);

    // Determine icon based on subject type
    const getActivityIcon = () => {
        const type = subjectType.toLowerCase();
        if (type.includes('shift')) return 'time-outline';
        if (type.includes('customer')) return 'person-outline';
        if (type.includes('lifting')) return 'arrow-up-circle-outline';
        if (type.includes('tank')) return 'water-outline';
        if (type.includes('product')) return 'pricetag-outline';
        if (type.includes('station')) return 'business-outline';
        return 'document-text-outline';
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3 active:bg-slate-700/50"
        >
            <View className="flex-row items-start gap-3">
                <View className="bg-blue-500/20 p-2 rounded-lg">
                    <Ionicons name={getActivityIcon() as any} size={20} color="#60a5fa" />
                </View>
                <View className="flex-1">
                    <Text className="text-slate-200 text-sm leading-5 mb-2" numberOfLines={2}>
                        {description}
                    </Text>
                    <View className="flex-row items-center gap-2">
                        <Text className="text-slate-500 text-xs">
                            {causerName}
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-slate-600" />
                        <Text className="text-slate-500 text-xs">
                            {timeAgo}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </View>
        </TouchableOpacity>
    );
});

export default function SystemTab() {
    const { start } = useTutorial();
    const { data: auditLogsResponse, isLoading, refetch } = useAuditLogIndex();
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Extract data safely
    const auditLogs: AuditLogResource[] = (auditLogsResponse as unknown as AuditLogIndex200)?.data ?? [];

    // Fetch detailed log when selected
    const { data: detailResponse, isLoading: isLoadingDetail } = useAuditLogShow(
        Number(selectedLogId ?? 0),
        {
            query: {
                enabled: !!selectedLogId,
            }
        }
    );


    // Extract the log data - cast to AuditLogShow200 and access .data property
    const selectedLog = React.useMemo(() => {
        if (!detailResponse) return undefined;
        const response = detailResponse as unknown as import('@/features/api/model').AuditLogShow200;
        return response?.data;
    }, [detailResponse]);


    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleLogPress = useCallback((id: string) => {
        setSelectedLogId(id);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedLogId(null);
    }, []);

    // Render changes in a formatted way
    const renderChanges = (changes: any) => {
        if (!changes || typeof changes !== 'object') {
            return <Text className="text-slate-400 text-sm">No changes recorded</Text>;
        }

        const { old: oldValue, new: newValue } = changes;

        // Helper to render a value
        const renderValue = (value: any, label: string, color: string) => {
            // Show {} for null/undefined values or empty arrays (backend returns [] for empty)
            if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
                return (
                    <View className="mb-2">
                        <Text className={`${color} text-xs font-bold mb-1`}>{label}</Text>
                        <Text className="text-slate-500 text-sm ml-2 font-mono">{'{}'}</Text>
                    </View>
                );
            }

            if (Array.isArray(value)) {
                return (
                    <View className="mb-2">
                        <Text className={`${color} text-xs font-bold mb-1`}>{label}</Text>
                        {value.map((item, idx) => (
                            <Text key={idx} className="text-slate-300 text-sm ml-2">
                                • {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                            </Text>
                        ))}
                    </View>
                );
            }

            return (
                <View className="mb-2">
                    <Text className={`${color} text-xs font-bold mb-1`}>{label}</Text>
                    <Text className="text-slate-300 text-sm ml-2">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </Text>
                </View>
            );
        };

        return (
            <View className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                {renderValue(oldValue, 'Previous Value', 'text-red-400')}
                {renderValue(newValue, 'New Value', 'text-emerald-400')}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar style="light" backgroundColor="#0f172a" />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-4 py-4 border-b border-slate-800">
                    <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-white">System</Text>
                            <Text className="text-slate-500 text-sm mt-1">Audit trail and activity log</Text>
                        </View>
                        <Pressable
                            onPress={() => start({ force: true })}
                            className="bg-emerald-500 px-4 py-2 rounded-full active:opacity-80"
                        >
                            <Text className="text-white font-black text-xs uppercase tracking-wider">Show tutorial</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Audit Logs List */}
                <View className="flex-1 px-4 pt-4">
                    {isLoading ? (
                        <View>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <AuditLogSkeleton key={i} />
                            ))}
                        </View>
                    ) : (
                        <FlashList
                            data={auditLogs}
                            renderItem={({ item }) => (
                                <AuditLogItem
                                    id={item.id}
                                    description={item.description}
                                    causerName={item.causer?.name ?? 'System'}
                                    timeAgo={item.time_ago}
                                    subjectType={item.subject?.type ?? 'Unknown'}
                                    onPress={handleLogPress}
                                />
                            )}
                            keyExtractor={(item) => item.id}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#60a5fa"
                                />
                            }
                            ListEmptyComponent={() => (
                                <View className="items-center justify-center p-10">
                                    <Ionicons name="document-text-outline" size={48} color="#475569" />
                                    <Text className="text-slate-500 text-center mt-4">No audit logs found</Text>
                                    <Text className="text-slate-600 text-center text-sm mt-2">
                                        Activity will appear here as it happens
                                    </Text>
                                </View>
                            )}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </View>

                <Modal
                    visible={!!selectedLogId}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={handleCloseModal}
                >
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl" style={{ maxHeight: '85%' }}>
                            {/* Modal Header */}
                            <View className="p-6 border-b border-slate-800 flex-row justify-between items-center bg-slate-800/50 rounded-t-3xl">
                                <Text className="text-xl font-bold text-white">Activity Details</Text>
                                <TouchableOpacity onPress={handleCloseModal}>
                                    <Ionicons name="close-circle" size={28} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            {/* Modal Content */}
                            <ScrollView className="p-6" contentContainerStyle={{ paddingBottom: 40 }}>
                                {isLoadingDetail ? (
                                    <View className="py-10">
                                        <AuditLogSkeleton />
                                        <AuditLogSkeleton />
                                    </View>
                                ) : !selectedLog ? (
                                    <View className="items-center py-10">
                                        <Text className="text-slate-500">No details available</Text>
                                        <Text className="text-slate-600 text-xs mt-2">ID: {selectedLogId}</Text>
                                    </View>
                                ) : (
                                    <View>
                                        {/* Description */}
                                        <View className="mb-6">
                                            <Text className="text-slate-400 text-xs uppercase mb-2 font-bold">
                                                Action
                                            </Text>
                                            <Text className="text-white text-base leading-6">
                                                {selectedLog.description}
                                            </Text>
                                        </View>

                                        {/* Metadata Grid */}
                                        <View className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
                                            <Text className="text-slate-400 text-xs uppercase mb-3 font-bold">
                                                Metadata
                                            </Text>

                                            {/* User */}
                                            <View className="flex-row justify-between py-2 border-b border-slate-700">
                                                <Text className="text-slate-300">User</Text>
                                                <Text className="text-white font-medium">
                                                    {selectedLog.causer?.name ?? 'System'}
                                                </Text>
                                            </View>

                                            {/* Role */}
                                            {selectedLog.causer?.role ? (
                                                <View className="flex-row justify-between py-2 border-b border-slate-700">
                                                    <Text className="text-slate-300">Role</Text>
                                                    <Text className="text-blue-400 text-sm px-2 py-1 bg-blue-500/20 rounded">
                                                        {selectedLog.causer.role}
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {/* Timestamp */}
                                            <View className="flex-row justify-between py-2 border-b border-slate-700">
                                                <Text className="text-slate-300">When</Text>
                                                <Text className="text-white">
                                                    {selectedLog.time_ago}
                                                </Text>
                                            </View>

                                            {/* Exact Time */}
                                            <View className="flex-row justify-between py-2 border-b border-slate-700">
                                                <Text className="text-slate-300">Date & Time</Text>
                                                <Text className="text-slate-400 text-sm font-mono">
                                                    {new Date(selectedLog.timestamp).toLocaleString()}
                                                </Text>
                                            </View>

                                            {/* Subject Type */}
                                            <View className="flex-row justify-between py-2 border-b border-slate-700">
                                                <Text className="text-slate-300">Resource Type</Text>
                                                <Text className="text-purple-400 text-sm px-2 py-1 bg-purple-500/20 rounded">
                                                    {selectedLog.subject?.type ?? 'N/A'}
                                                </Text>
                                            </View>

                                            {/* Subject ID */}
                                            <View className="flex-row justify-between py-2">
                                                <Text className="text-slate-300">Resource ID</Text>
                                                <Text className="text-slate-400 font-mono text-sm">
                                                    {selectedLog.subject?.id ?? 'N/A'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Changes Section */}
                                        <View className="mb-6">
                                            <Text className="text-slate-400 text-xs uppercase mb-3 font-bold">
                                                Changes
                                            </Text>
                                            {renderChanges(selectedLog.changes)}
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}
