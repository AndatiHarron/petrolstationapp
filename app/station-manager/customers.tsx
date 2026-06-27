import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Ionicons } from '@expo/vector-icons';
import { useCustomersStore, useCustomersDestroy, getCustomersIndexQueryKey } from '../../features/api/customer/customer';
import { useEditRequestsStore } from '../../features/api/edit-request/edit-request';
import { CustomersIndex200, StoreCustomerRequest, CustomersIndex200Meta, CustomersIndex200Links, StoreEditRequestRequest } from '../../features/api/model';
import { InputField } from '../../components/input-field';
import { Button } from '../../components/button';
import { PaginationControls } from '../../components/pagination-controls';
import { SkeletonCard } from '../../components/station-manager/skeleton-card';
import { api } from '../../lib/axios';

// Custom fetch function for paginated customers
const fetchCustomers = async (page: number): Promise<CustomersIndex200> => {
    const response = await api.get<CustomersIndex200>('/v1/customers', {
        params: { page },
    });
    return response.data;
};

// Separate component for list item to allow for memoization if needed later
const CustomerItem = ({ item, onPress }: { item: CustomersIndex200['data'][number]; onPress: (item: CustomersIndex200['data'][number]) => void }) => {
    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700"
        >
            <View className="flex-row justify-between items-center">
                <View className="flex-1">
                    <Text className="text-white text-lg font-bold">{item.name}</Text>
                    <Text className="text-slate-400 text-sm mt-1">{item.email}</Text>
                    {item.phone && <Text className="text-slate-500 text-xs mt-0.5">{item.phone}</Text>}
                </View>
                <View className="bg-slate-700 p-2 rounded-full">
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
            </View>
            <View className="flex-row flex-wrap gap-2 mt-3">
                {item.current_balance > 0 && (
                    <View className="bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        <Text className="text-amber-400 text-xs font-semibold">
                            Outstanding: KES {item.current_balance.toLocaleString()}
                        </Text>
                    </View>
                )}
                <View className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    <Text className="text-emerald-400 text-xs font-semibold">
                        Available Credit: KES {item.available_credit.toLocaleString()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function CustomersScreen() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    // Use custom paginated query
    const { data: customersData, isLoading, isFetching, refetch, error } = useQuery({
        queryKey: [...getCustomersIndexQueryKey(), { page }],
        queryFn: () => fetchCustomers(page),
    });

    const [refreshing, setRefreshing] = useState(false);

    // Extract pagination info
    const meta: CustomersIndex200Meta | undefined = customersData?.meta;
    const links: CustomersIndex200Links | undefined = customersData?.links;
    const customersList = customersData?.data ?? [];

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newItem, setNewItem] = useState<StoreCustomerRequest>({
        name: '',
        email: '',
        phone: '',
        tax_pin: '',
        credit_limit: 0,
    });
    const [editReason, setEditReason] = useState('');

    // Details Modal State
    const [selectedCustomer, setSelectedCustomer] = useState<CustomersIndex200['data'][number] | null>(null);

    const editRequestMutation = useEditRequestsStore({
        mutation: {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                setEditingId(null);
                setEditReason('');
                setNewItem({
                    name: '',
                    email: '',
                    phone: '',
                    tax_pin: '',
                    credit_limit: 0,
                });
                Alert.alert("Success", "Edit request submitted for approval.");
            },
            onError: (error: any) => {
                Alert.alert("Error", error?.response?.data?.message || "Failed to submit edit request.");
            }
        }
    });

    const createMutation = useCustomersStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getCustomersIndexQueryKey() });
                setIsCreateModalOpen(false);
                setNewItem({
                    name: '',
                    email: '',
                    phone: '',
                    tax_pin: '',
                    credit_limit: 0,
                });
                Alert.alert("Success", "Customer created successfully.");
            },
            onError: (error: any) => {
                Alert.alert("Error", error?.response?.data?.message || "Failed to create customer.");
            }
        }
    });

    const deleteMutation = useCustomersDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getCustomersIndexQueryKey() });
                setSelectedCustomer(null);
                Alert.alert("Success", "Customer deleted successfully.");
            },
            onError: (error: any) => {
                Alert.alert("Error", error?.response?.data?.message || "Failed to delete customer.");
            }
        }
    });

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <Text className="text-white text-lg font-bold">Error fetching customers: {(error as Error).message}</Text>
            </View>
        );
    }

    const handleCustomerPress = (customer: CustomersIndex200['data'][number]) => {
        setSelectedCustomer(customer);
    };

    const handleAddPress = () => {
        setEditingId(null);
        setNewItem({
            name: '',
            email: '',
            phone: '',
            tax_pin: '',
            credit_limit: 0,
        });
        setEditReason('');
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = () => {
        if (!newItem.name || !newItem.email) {
            Alert.alert("Validation Error", "Name and Email are required.");
            return;
        }

        if (editingId) {
            if (!editReason.trim()) {
                Alert.alert("Validation Error", "Please provide a reason for this edit request.");
                return;
            }

            const payload: StoreEditRequestRequest = {
                model_type: 'App\\Models\\Customer',
                model_id: editingId,
                requested_data: [JSON.stringify(newItem)],
                reason: editReason
            };

            editRequestMutation.mutate({ data: payload });
        } else {
            createMutation.mutate({ data: newItem });
        }
    };

    const handleEditPress = () => {
        if (!selectedCustomer) return;

        setEditingId(selectedCustomer.id || null);
        setNewItem({
            name: selectedCustomer.name,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone || '',
            tax_pin: selectedCustomer.tax_pin || '',
            credit_limit: selectedCustomer.credit_limit || 0,
        });
        setEditReason('');
        setSelectedCustomer(null);
        setIsCreateModalOpen(true);
    };

    const handleDeletePress = () => {
        if (!selectedCustomer?.id) return;

        Alert.alert(
            "Delete Customer",
            `Are you sure you want to delete ${selectedCustomer.name}? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate({ customer: selectedCustomer.id! })
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-200 bg-white">
                <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-bold text-white">Customers</Text>
                    {meta && (
                        <View className="bg-blue-500/20 px-2 py-0.5 rounded-full">
                            <Text className="text-blue-400 text-xs font-bold">{meta.total}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={handleAddPress}>
                    <Ionicons name="add-circle" size={32} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 px-4 pt-4">
                {isLoading ? (
                    <View>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <View key={i} className="mb-3 w-full">
                                <SkeletonCard variant="customer" style={{ width: '100%' }} />
                            </View>
                        ))}
                    </View>
                ) : (
                    <FlashList
                        data={customersList}
                        renderItem={({ item }) => (
                            <CustomerItem item={item} onPress={handleCustomerPress} />
                        )}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                        }
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center p-10">
                                <Text className="text-slate-500 text-center">No customers found.</Text>
                                <Text className="text-slate-600 text-center text-sm mt-2">Tap + to add a new customer.</Text>
                            </View>
                        )}
                        ListFooterComponent={() => (
                            meta && meta.last_page > 1 ? (
                                <PaginationControls
                                    currentPage={meta.current_page}
                                    lastPage={meta.last_page}
                                    onPageChange={handlePageChange}
                                    loading={isFetching}
                                    hasPrev={!!links?.prev}
                                    hasNext={!!links?.next}
                                />
                            ) : null
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>

            {/* Create Customer/Request Edit Modal */}
            <Modal
                visible={isCreateModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCreateModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior="padding"
                    enabled={Platform.OS === 'ios'}
                    className="flex-1 justify-end"
                    keyboardVerticalOffset={0}
                >
                    <View className="bg-slate-900 border-t border-slate-700 h-[85%] rounded-t-3xl shadow-2xl">
                        <View className="p-6 border-b border-slate-800 flex-row justify-between items-center bg-slate-800/50 rounded-t-3xl">
                            <Text className="text-xl font-bold text-white">{editingId ? 'Request Edit' : 'New Customer'}</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                <Ionicons name="close-circle" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            className="flex-1 p-6"
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {editingId && (
                                <View className="mb-4 bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                                    <Text className="text-blue-400 text-sm">
                                        You are requesting an update to this customer. An admin will review your changes.
                                    </Text>
                                </View>
                            )}

                            <InputField
                                label="Full Name *"
                                placeholder="Enter customer name"
                                value={newItem.name}
                                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
                            />

                            <InputField
                                label="Email Address *"
                                placeholder="customer@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={newItem.email}
                                onChangeText={(text) => setNewItem({ ...newItem, email: text })}
                            />

                            <InputField
                                label="Phone Number"
                                placeholder="+1234567890"
                                keyboardType="phone-pad"
                                value={newItem.phone || ''}
                                onChangeText={(text) => setNewItem({ ...newItem, phone: text })}
                            />

                            <InputField
                                label="Tax PIN"
                                placeholder="Tax Identification Number"
                                autoCapitalize="characters"
                                value={newItem.tax_pin || ''}
                                onChangeText={(text) => setNewItem({ ...newItem, tax_pin: text })}
                            />

                            <InputField
                                label="Credit Limit"
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={newItem.credit_limit?.toString() || ''}
                                onChangeText={(text) => setNewItem({ ...newItem, credit_limit: parseFloat(text) || 0 })}
                            />

                            {editingId && (
                                <InputField
                                    label="Reason for Edit *"
                                    placeholder="Why are you making this change?"
                                    value={editReason}
                                    onChangeText={setEditReason}
                                    multiline
                                    style={{ height: 80, textAlignVertical: 'top' }}
                                />
                            )}

                            <View className="mt-6">
                                <Button
                                    title={editingId ? "Submit Edit Request" : "Create Customer"}
                                    onPress={handleCreateSubmit}
                                    loading={createMutation.isPending || editRequestMutation.isPending}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Customer Details Modal */}
            <Modal
                visible={!!selectedCustomer}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedCustomer(null)}
            >
                <View className="flex-1 justify-end">
                    <View className="bg-slate-900 border-t border-slate-700 h-[60%] rounded-t-3xl shadow-2xl p-6">
                        <View className="flex-row justify-between items-start mb-6">
                            <View>
                                <Text className="text-2xl font-bold text-white max-w-[80%]">{selectedCustomer?.name}</Text>
                                <Text className="text-slate-400 text-sm mt-1">{selectedCustomer?.email}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                                <Ionicons name="close-circle" size={32} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View>
                            <View className="bg-slate-800 p-4 rounded-xl mb-6">
                                <Text className="text-slate-400 text-xs uppercase mb-1 font-bold">Contact Info</Text>
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="call" size={16} color="#94a3b8" />
                                    <Text className="text-white ml-2">{selectedCustomer?.phone || 'N/A'}</Text>
                                </View>
                            </View>

                            <View className="bg-slate-800 p-4 rounded-xl">
                                <Text className="text-slate-400 text-xs uppercase mb-2 font-bold">Financial Details</Text>
                                <View className="flex-row justify-between mb-2 pb-2 border-b border-slate-700">
                                    <Text className="text-slate-300">Tax PIN</Text>
                                    <Text className="text-white font-mono">{selectedCustomer?.tax_pin || 'N/A'}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-slate-300">Credit Limit</Text>
                                    <Text className="text-emerald-400 font-mono font-bold">KES {selectedCustomer?.credit_limit?.toLocaleString() || '0.00'}</Text>
                                </View>
                            </View>
                        </View>

                        <View className="mt-auto pt-6 mb-24 gap-3">
                            <Button
                                title="Request Edit"
                                onPress={handleEditPress}
                                className="bg-slate-700"
                            />
                            <Button
                                title="Delete Customer"
                                variant="outline"
                                onPress={handleDeletePress}
                                loading={deleteMutation.isPending}
                                className="border-red-500/50"
                                style={{ borderColor: '#ef4444' }}
                            />
                            <Text className="text-red-500 text-center mt-2 text-xs">
                                Note: This action is irreversible.
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
