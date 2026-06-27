import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { memo, useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { InputField } from '@/components/input-field';
import {
    getEditRequestsIndexQueryKey,
    useEditRequestsIndex,
    useEditRequestsUpdate,
} from '@/features/api/edit-request/edit-request';
import type {
    EditRequestResource,
    EditRequestsIndex200,
    UpdateEditRequestRequest,
} from '@/features/api/model';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

// ---- Helper ----
const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const getModelLabel = (modelType: string) => {
    if (modelType.includes('Customer')) return 'Customer';
    if (modelType.includes('Shift')) return 'Shift';
    if (modelType.includes('Lifting')) return 'Lifting';
    return modelType.split('\\').pop() || modelType;
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'approved': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
        case 'rejected': return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' };
        default: return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
    }
};

// ---- Request Item ----
const RequestItem = memo(({ item, onPress }: { item: EditRequestResource; onPress: (item: EditRequestResource) => void }) => {
    const statusColors = getStatusColor(item.status);
    const modelLabel = getModelLabel(item.model_type);

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700"
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                    <Text className="text-black text-base font-bold">{modelLabel} Edit</Text>
                    <Text className="text-gray-600 text-sm mt-0.5">
                        by {item.user?.name ?? 'Unknown'} • {formatDate(item.created_at)}
                    </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-lg ${statusColors.bg} border ${statusColors.border}`}>
                    <Text className={`text-xs font-bold uppercase ${statusColors.text}`}>
                        {item.status}
                    </Text>
                </View>
            </View>

            {item.reason && (
                <View className="bg-slate-700/40 p-2.5 rounded-lg mt-1">
                    <Text className="text-gray-600 text-xs uppercase mb-1">Reason</Text>
                    <Text className="text-slate-300 text-sm" numberOfLines={2}>{item.reason}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

// ---- Data Diff Display ----
const DataDiff = ({ label, original, requested }: { label: string; original: any; requested: any }) => {
    if (typeof original === 'object' && original !== null) {
        const keys = [...new Set([...Object.keys(original || {}), ...Object.keys(requested || {})])];
        return (
            <View className="mb-3">
                    <Text className="text-gray-600 text-xs uppercase mb-2 font-bold">{label}</Text>
                {keys.map((key) => (
                    <DataDiff
                        key={key}
                        label={key}
                        original={original?.[key]}
                        requested={requested?.[key]}
                    />
                ))}
            </View>
        );
    }

    const changed = String(original) !== String(requested);

    return (
        <View className="flex-row justify-between items-center py-2 border-b border-slate-700/50">
            <Text className="text-gray-600 text-sm flex-1 capitalize">{label.replace(/_/g, ' ')}</Text>
            <View className="flex-row items-center gap-2">
                <Text className={`text-sm font-mono ${changed ? 'text-red-400 line-through' : 'text-slate-300'}`}>
                    {String(original ?? '—')}
                </Text>
                {changed && (
                    <>
                        <Ionicons name="arrow-forward" size={12} color="#60a5fa" />
                        <Text className="text-emerald-400 text-sm font-mono font-bold">
                            {String(requested ?? '—')}
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
};

export default function AdminRequestsScreen() {
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState<EditRequestResource | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [adminComments, setAdminComments] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch requests
    const { data: rawResponse, isLoading, refetch } = useEditRequestsIndex();

    // Unwrap paginated response
    const indexData = (rawResponse as any) as EditRequestsIndex200 | undefined;
    const allRequests: EditRequestResource[] = indexData?.data ?? [];

    // Filter
    const filteredRequests = filterStatus === 'all'
        ? allRequests
        : allRequests.filter(r => r.status === filterStatus);

    // Update mutation
    const { mutate: updateRequest, isPending: isUpdating } = useEditRequestsUpdate({
        mutation: {
            onSuccess: () => {
                setSelectedRequest(null);
                setAdminComments('');
                queryClient.invalidateQueries({ queryKey: getEditRequestsIndexQueryKey() });
                Alert.alert('Success', 'Edit request updated successfully.');
            },
            onError: (error: any) => {
                Alert.alert('Error', error?.response?.data?.message || 'Failed to update request.');
            },
        },
    });

    const handleAction = (status: 'approved' | 'rejected') => {
        if (!selectedRequest) return;

        const actionLabel = status === 'approved' ? 'Approve' : 'Reject';
        Alert.alert(
            `${actionLabel} Request`,
            `Are you sure you want to ${actionLabel.toLowerCase()} this edit request?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: actionLabel,
                    style: status === 'rejected' ? 'destructive' : 'default',
                    onPress: () => {
                        const payload: UpdateEditRequestRequest = {
                            status,
                            comments: adminComments.trim() || null,
                        };
                        updateRequest({ editRequest: selectedRequest.id, data: payload });
                    },
                },
            ]
        );
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Parse JSON data safely
    const parseData = (jsonString: string) => {
        try { return JSON.parse(jsonString); } catch { return null; }
    };

    const filterButtons: { label: string; value: FilterStatus }[] = [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
    ];

    return (
        <View className="flex-1 bg-slate-900">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} className="px-4 pt-4 pb-2">
                    <Text className="text-white text-2xl font-bold">Edit Requests</Text>
                    <Text className="text-slate-400 text-sm mt-1">
                        {allRequests.length} total request{allRequests.length !== 1 ? 's' : ''}
                    </Text>
                </Animated.View>

                {/* Filters */}
                <View className="px-4 py-3">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            {filterButtons.map((btn) => (
                                <TouchableOpacity
                                    key={btn.value}
                                    onPress={() => setFilterStatus(btn.value)}
                                    className={`px-4 py-2 rounded-lg border ${filterStatus === btn.value
                                        ? 'bg-blue-600 border-blue-500'
                                        : 'bg-slate-800 border-slate-700'
                                        }`}
                                >
                                    <Text className={`text-sm font-semibold ${filterStatus === btn.value ? 'text-black' : 'text-gray-600'}
                                        }`}>
                                        {btn.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* List */}
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#60a5fa" />
                        <Text className="text-gray-600 mt-4">Loading requests...</Text>
                    </View>
                ) : (
                    <FlatList<EditRequestResource>
                        data={filteredRequests}
                        renderItem={({ item }) => <RequestItem item={item} onPress={setSelectedRequest} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                        }
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center py-20">
                                <Ionicons name="document-text-outline" size={56} color="#475569" />
                                <Text className="text-slate-500 text-center mt-4 text-base">
                                    {filterStatus === 'all' ? 'No edit requests found.' : `No ${filterStatus} requests.`}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>

            {/* Detail / Review Modal */}
            <Modal
                visible={!!selectedRequest}
                animationType="slide"
                transparent
                onRequestClose={() => setSelectedRequest(null)}
            >
                <View className="flex-1 justify-end">
                    <View className="bg-slate-900 border-t border-slate-700 h-[85%] rounded-t-3xl shadow-2xl">
                        {/* Modal Header */}
                        <View className="p-5 border-b border-slate-800 flex-row justify-between items-center bg-slate-800/50 rounded-t-3xl">
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-white">
                                    {selectedRequest ? getModelLabel(selectedRequest.model_type) : ''} Edit Request
                                </Text>
                                <Text className="text-slate-400 text-xs mt-0.5">
                                    {selectedRequest ? formatDate(selectedRequest.created_at) : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                                <Ionicons name="close-circle" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                            {selectedRequest && (() => {
                                const statusColors = getStatusColor(selectedRequest.status);
                                const originalData = parseData(selectedRequest.original_data);
                                const requestedData = parseData(selectedRequest.requested_data);

                                return (
                                    <>
                                        {/* Request Info */}
                                        <View className="flex-row gap-3 mb-4">
                                            <View className={`px-3 py-1 rounded-lg ${statusColors.bg} border ${statusColors.border}`}>
                                                <Text className={`text-xs font-bold uppercase ${statusColors.text}`}>
                                                    {selectedRequest.status}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="bg-slate-800 p-4 rounded-xl mb-4">
                                            <View className="flex-row justify-between mb-2 pb-2 border-b border-slate-700">
                                                <Text className="text-slate-400 text-sm">Requested by</Text>
                                                <Text className="text-white font-medium">{selectedRequest.user?.name ?? 'Unknown'}</Text>
                                            </View>
                                            <View className="flex-row justify-between mb-2 pb-2 border-b border-slate-700">
                                                <Text className="text-slate-400 text-sm">Model</Text>
                                                <Text className="text-white font-medium">{getModelLabel(selectedRequest.model_type)}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-slate-400 text-sm">Submitted</Text>
                                                <Text className="text-white font-medium">{formatDate(selectedRequest.created_at)}</Text>
                                            </View>
                                        </View>

                                        {/* Reason */}
                                        {selectedRequest.reason && (
                                            <View className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-4">
                                                <Text className="text-amber-400 text-xs uppercase font-bold mb-2">Reason for Edit</Text>
                                                <Text className="text-slate-200 text-sm leading-5">{selectedRequest.reason}</Text>
                                            </View>
                                        )}

                                        {/* Data Diff */}
                                        <View className="bg-slate-800 p-4 rounded-xl mb-4">
                                            <Text className="text-slate-400 text-xs uppercase font-bold mb-3">Changes</Text>
                                            {originalData && requestedData ? (
                                                <DataDiff label="Data" original={originalData} requested={requestedData} />
                                            ) : (
                                                <View>
                                                    <Text className="text-slate-500 text-xs uppercase mb-1">Original</Text>
                                                    <Text className="text-slate-300 text-sm mb-3 font-mono">{JSON.stringify(selectedRequest.original_data, null, 2) || '—'}</Text>
                                                    <Text className="text-slate-500 text-xs uppercase mb-1">Requested</Text>
                                                    <Text className="text-emerald-400 text-sm font-mono">{JSON.stringify(selectedRequest.requested_data, null, 2) || '—'}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Approver Info */}
                                        {selectedRequest.approver && (
                                            <View className="bg-slate-800 p-4 rounded-xl mb-4">
                                                <Text className="text-slate-400 text-xs uppercase font-bold mb-2">Reviewed By</Text>
                                                <Text className="text-white font-medium">{selectedRequest.approver.name}</Text>
                                                {selectedRequest.comments && (
                                                    <Text className="text-slate-300 text-sm mt-2">{selectedRequest.comments}</Text>
                                                )}
                                            </View>
                                        )}

                                        {/* Admin Actions (only for pending) */}
                                        {selectedRequest.status === 'pending' && (
                                            <View className="mt-2">
                                                <InputField
                                                    label="Admin Comments (optional)"
                                                    placeholder="Add any comments..."
                                                    value={adminComments}
                                                    onChangeText={setAdminComments}
                                                    multiline
                                                    numberOfLines={3}
                                                />

                                                <View className="flex-row gap-3 mt-2">
                                                    <View className="flex-1">
                                                        <Button
                                                            title="Reject"
                                                            variant="outline"
                                                            onPress={() => handleAction('rejected')}
                                                            loading={isUpdating}
                                                        />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Button
                                                            title="Approve"
                                                            onPress={() => handleAction('approved')}
                                                            loading={isUpdating}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
