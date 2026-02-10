import React, { memo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, CreditCard, User, Calendar, FileText, Car } from 'lucide-react-native';
import type { CreditSaleResource, CreditSalesShow200, AuthenticationExceptionResponse } from '@/features/api/model';
import { useCreditSalesShow } from '@/features/api/credit-sale/credit-sale';

interface CreditSaleDetailModalProps {
    creditSaleId: string | null;
    onClose: () => void;
}

export const CreditSaleDetailModal = memo(function CreditSaleDetailModal({
    creditSaleId,
    onClose,
}: CreditSaleDetailModalProps) {
    const { data: response, isLoading } = useCreditSalesShow(creditSaleId || '', {
        query: {
            enabled: !!creditSaleId,
        },
    });


    // Type guard to check if response has data
    const hasData = (res: unknown): res is { data: CreditSalesShow200 } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };

    const creditSale: CreditSaleResource | undefined = hasData(response) ? response.data as unknown as CreditSaleResource : undefined;
    const formattedDate = creditSale
        ? new Date(creditSale.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    const formattedAmount = creditSale
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'KES',
        }).format(creditSale.amount)
        : '';

    return (
        <Modal
            visible={!!creditSaleId}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60">
                <View className="flex-1 mt-24 bg-slate-900 rounded-t-3xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800">
                        <Text className="text-white text-xl font-bold">Credit Sale Details</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-slate-800 p-2 rounded-full"
                            activeOpacity={0.7}
                        >
                            <X size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        className="flex-1 px-6"
                        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <>
                                {/* Amount Skeleton */}
                                <View className="bg-slate-800/50 rounded-2xl p-6 mb-6">
                                    <View className="h-4 w-32 bg-slate-700/50 rounded mb-3" />
                                    <View className="h-10 w-48 bg-slate-700/50 rounded" />
                                </View>

                                {/* Customer Info Skeleton */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-4">
                                    <View className="h-4 w-40 bg-slate-700/50 rounded mb-4" />
                                    <View className="bg-slate-900/50 rounded-xl p-4">
                                        <View className="h-3 w-24 bg-slate-700/50 rounded mb-2" />
                                        <View className="h-5 w-full bg-slate-700/50 rounded" />
                                    </View>
                                </View>

                                {/* Transaction Details Skeleton */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-4">
                                    <View className="h-4 w-36 bg-slate-700/50 rounded mb-4" />
                                    <View className="space-y-3">
                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <View className="h-3 w-28 bg-slate-700/50 rounded mb-2" />
                                            <View className="h-4 w-full bg-slate-700/50 rounded" />
                                        </View>
                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <View className="h-3 w-24 bg-slate-700/50 rounded mb-2" />
                                            <View className="h-4 w-3/4 bg-slate-700/50 rounded" />
                                        </View>
                                        <View className="bg-slate-900/50 rounded-xl p-4">
                                            <View className="h-3 w-32 bg-slate-700/50 rounded mb-2" />
                                            <View className="h-4 w-1/2 bg-slate-700/50 rounded" />
                                        </View>
                                    </View>
                                </View>
                            </>
                        ) : creditSale ? (
                            <>
                                {/* Amount Card */}
                                <View className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-6 mb-6 border border-emerald-500/30">
                                    <View className="flex-row items-center mb-2">
                                        <CreditCard size={20} color="#10b981" />
                                        <Text className="text-emerald-400 text-sm font-semibold ml-2">
                                            TRANSACTION AMOUNT
                                        </Text>
                                    </View>
                                    <Text className="text-white text-4xl font-bold">{formattedAmount}</Text>
                                </View>

                                {/* Customer Information */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-4">
                                    <View className="flex-row items-center mb-4">
                                        <User size={18} color="#64748b" />
                                        <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                            Customer Information
                                        </Text>
                                    </View>
                                    <View className="bg-slate-900/50 rounded-xl p-4">
                                        <Text className="text-slate-500 text-xs mb-1">Customer Name</Text>
                                        <Text className="text-white text-base font-semibold">
                                            {creditSale.customer_name || 'Unknown Customer'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Transaction Details */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-4">
                                    <View className="flex-row items-center mb-4">
                                        <FileText size={18} color="#64748b" />
                                        <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                            Transaction Details
                                        </Text>
                                    </View>

                                    <View className="space-y-3">
                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <Text className="text-slate-500 text-xs mb-1">Transaction ID</Text>
                                            <Text className="text-white text-sm font-mono">{creditSale.id}</Text>
                                        </View>

                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <Text className="text-slate-500 text-xs mb-1">Date & Time</Text>
                                            <View className="flex-row items-center">
                                                <Calendar size={14} color="#64748b" />
                                                <Text className="text-white text-sm ml-2">{formattedDate}</Text>
                                            </View>
                                        </View>

                                        {creditSale.vehicle_reg && (
                                            <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                                <Text className="text-slate-500 text-xs mb-1">Vehicle Registration</Text>
                                                <View className="flex-row items-center">
                                                    <Car size={14} color="#64748b" />
                                                    <Text className="text-white text-sm font-semibold ml-2">
                                                        {creditSale.vehicle_reg}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {creditSale.notes && (
                                            <View className="bg-slate-900/50 rounded-xl p-4">
                                                <Text className="text-slate-500 text-xs mb-2">Notes</Text>
                                                <Text className="text-slate-300 text-sm leading-5">
                                                    {creditSale.notes}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View className="flex-1 items-center justify-center py-20">
                                <Text className="text-slate-400">Credit sale not found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});
