import React, { memo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Building2, Calendar, DollarSign, Gauge, TrendingUp, AlertTriangle, Droplet, CreditCard } from 'lucide-react-native';
import type { ShiftResource, ShiftShow200, AuthenticationExceptionResponse } from '@/features/api/model';
import { useShiftShow } from '@/features/api/shift/shift';

interface ShiftDetailModalProps {
    shiftId: string | null;
    onClose: () => void;
}

export const ShiftDetailModal = memo(function ShiftDetailModal({
    shiftId,
    onClose,
}: ShiftDetailModalProps) {
    const { data: response, isLoading } = useShiftShow(shiftId || '', {
        query: {
            enabled: !!shiftId,
        },
    });

    // Type guard to check if response has data
    const hasData = (res: unknown): res is { data: ShiftShow200 } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };

    const shift: ShiftResource | undefined = hasData(response) ? response.data as unknown as ShiftResource : undefined;

    const formattedDate = shift
        ? new Date(shift.started_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);

    return (
        <Modal
            visible={!!shiftId}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60">
                <View className="flex-1 mt-12 bg-slate-900 rounded-t-3xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800">
                        <Text className="text-white text-xl font-bold">Shift Details</Text>
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
                                {/* Station & Status Skeleton */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1">
                                            <View className="bg-slate-700/50 p-3 rounded-xl mr-3 w-14 h-14" />
                                            <View className="flex-1">
                                                <View className="h-5 w-40 bg-slate-700/50 rounded mb-2" />
                                                <View className="h-3 w-32 bg-slate-700/50 rounded" />
                                            </View>
                                        </View>
                                        <View className="h-6 w-16 bg-slate-700/50 rounded-full" />
                                    </View>
                                </View>

                                {/* Financials Skeleton */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-6 border border-slate-700/50">
                                    <View className="h-4 w-36 bg-slate-700/50 rounded mb-4" />
                                    <View className="space-y-3">
                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <View className="h-3 w-32 bg-slate-700/50 rounded mb-2" />
                                            <View className="h-8 w-40 bg-slate-700/50 rounded" />
                                        </View>
                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <View className="h-3 w-32 bg-slate-700/50 rounded mb-2" />
                                            <View className="h-8 w-40 bg-slate-700/50 rounded" />
                                        </View>
                                        <View className="bg-slate-900/50 rounded-xl p-4">
                                            <View className="h-3 w-20 bg-slate-700/50 rounded mb-2" />
                                            <View className="h-8 w-36 bg-slate-700/50 rounded" />
                                        </View>
                                    </View>
                                </View>

                                {/* Readings Skeleton */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                    <View className="h-4 w-40 bg-slate-700/50 rounded mb-4" />
                                    {[1, 2, 3].map((i) => (
                                        <View key={i} className="bg-slate-900/50 rounded-xl p-4 mb-2">
                                            <View className="flex-row justify-between items-center">
                                                <View className="flex-1">
                                                    <View className="h-4 w-24 bg-slate-700/50 rounded mb-2" />
                                                    <View className="h-3 w-32 bg-slate-700/50 rounded" />
                                                </View>
                                                <View className="items-end">
                                                    <View className="h-4 w-16 bg-slate-700/50 rounded mb-1" />
                                                    <View className="h-3 w-20 bg-slate-700/50 rounded" />
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : shift ? (
                            <>
                                {/* Station & Status Card */}
                                <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center flex-1">
                                            <View className="bg-blue-500/10 p-3 rounded-xl mr-3">
                                                <Building2 size={24} color="#3b82f6" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-white text-lg font-bold">{shift.station_name}</Text>
                                                <View className="flex-row items-center mt-1">
                                                    <Calendar size={14} color="#64748b" />
                                                    <Text className="text-slate-400 text-sm ml-2">{formattedDate}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View className={`px-3 py-1 rounded-full ${shift.status === 'active' ? 'bg-emerald-500/10' :
                                            shift.status === 'locked' ? 'bg-amber-500/10' : 'bg-slate-500/10'
                                            }`}>
                                            <Text className={`text-xs font-semibold ${shift.status === 'active' ? 'text-emerald-400' :
                                                shift.status === 'locked' ? 'text-amber-400' : 'text-slate-400'
                                                }`}>
                                                {shift.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Financials Card */}
                                <View className={`rounded-2xl p-5 mb-6 border ${shift.variance_alert
                                    ? 'bg-red-950/20 border-red-800/50'
                                    : 'bg-slate-800/50 border-slate-700/50'
                                    }`}>
                                    <View className="flex-row items-center mb-4">
                                        <DollarSign size={18} color={shift.variance_alert ? '#ef4444' : '#10b981'} />
                                        <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                            Financial Summary
                                        </Text>
                                        {shift.variance_alert && (
                                            <View className="ml-auto flex-row items-center bg-red-500/10 px-2 py-1 rounded-full">
                                                <AlertTriangle size={14} color="#ef4444" />
                                                <Text className="text-red-400 text-xs font-semibold ml-1">VARIANCE ALERT</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View className="space-y-3">
                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <Text className="text-slate-500 text-xs mb-1">Expected Revenue</Text>
                                            <Text className="text-white text-2xl font-bold">
                                                {formatCurrency(shift.financials.expected)}
                                            </Text>
                                        </View>

                                        <View className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                            <Text className="text-slate-500 text-xs mb-1">Collected Revenue</Text>
                                            <Text className="text-emerald-400 text-2xl font-bold">
                                                {formatCurrency(shift.financials.collected)}
                                            </Text>
                                        </View>

                                        <View className={`rounded-xl p-4 ${shift.variance_alert ? 'bg-red-900/30' : 'bg-slate-900/50'
                                            }`}>
                                            <Text className="text-slate-500 text-xs mb-1">Variance</Text>
                                            <View className="flex-row items-center">
                                                <TrendingUp size={20} color={
                                                    shift.financials.variance > 0 ? '#10b981' :
                                                        shift.financials.variance < 0 ? '#ef4444' : '#64748b'
                                                } />
                                                <Text className={`text-2xl font-bold ml-2 ${shift.financials.variance > 0 ? 'text-emerald-400' :
                                                    shift.financials.variance < 0 ? 'text-red-400' : 'text-slate-400'
                                                    }`}>
                                                    {shift.financials.variance > 0 ? '+' : ''}
                                                    {formatCurrency(shift.financials.variance)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Meter Readings */}
                                {shift.readings && shift.readings.length > 0 && (
                                    <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                        <View className="flex-row items-center mb-4">
                                            <Gauge size={18} color="#64748b" />
                                            <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                                Meter Readings ({shift.readings.length})
                                            </Text>
                                        </View>
                                        {shift.readings.map((reading, index) => (
                                            <View key={index} className="bg-slate-900/50 rounded-xl p-4 mb-2">
                                                <View className="flex-row justify-between items-center">
                                                    <View className="flex-1">
                                                        <Text className="text-white font-semibold">Nozzle {reading.nozzle_id.slice(-4)}</Text>
                                                        <Text className="text-slate-500 text-xs mt-1">Volume: {reading.volume_sold}L</Text>
                                                    </View>
                                                    <View className="items-end">
                                                        <Text className="text-emerald-400 font-bold">{reading.closing_reading}L</Text>
                                                        <Text className="text-slate-500 text-xs">Opening: {reading.opening_reading}L</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Dip Readings */}
                                {shift.dips && shift.dips.length > 0 && (
                                    <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                        <View className="flex-row items-center mb-4">
                                            <Droplet size={18} color="#64748b" />
                                            <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                                Tank Dips ({shift.dips.length})
                                            </Text>
                                        </View>
                                        {shift.dips.map((dip, index) => (
                                            <View key={index} className="bg-slate-900/50 rounded-xl p-4 mb-2">
                                                <View className="flex-row justify-between items-center">
                                                    <View className="flex-1">
                                                        <Text className="text-white font-semibold">Tank {dip.tank_id.slice(-4)}</Text>
                                                        <Text className="text-slate-500 text-xs mt-1">Dip Reading</Text>
                                                    </View>
                                                    <View className="items-end">
                                                        <Text className="text-blue-400 font-bold">{dip.dip_mm}mm</Text>
                                                        <Text className="text-slate-500 text-xs">{dip.volume_liters}L</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Payments */}
                                {shift.payments && shift.payments.length > 0 && (
                                    <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                        <View className="flex-row items-center mb-4">
                                            <DollarSign size={18} color="#64748b" />
                                            <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                                Payment Methods
                                            </Text>
                                        </View>
                                        {shift.payments.map((payment, index) => (
                                            <View key={index} className="bg-slate-900/50 rounded-xl p-4 mb-2">
                                                <View className="flex-row justify-between items-center">
                                                    <Text className="text-white font-semibold">{payment.method}</Text>
                                                    <Text className="text-emerald-400 font-bold">{formatCurrency(Number(payment.amount))}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Credit Sales */}
                                {shift.credit_sales && shift.credit_sales.length > 0 && (
                                    <View className="bg-slate-800/50 rounded-2xl p-5 mb-6">
                                        <View className="flex-row items-center mb-4">
                                            <CreditCard size={18} color="#64748b" />
                                            <Text className="text-slate-400 text-sm font-semibold ml-2 uppercase">
                                                Credit Sales ({shift.credit_sales.length})
                                            </Text>
                                        </View>
                                        {shift.credit_sales.map((sale, index) => (
                                            <View key={index} className="bg-slate-900/50 rounded-xl p-4 mb-2">
                                                <View className="flex-row justify-between items-center">
                                                    <View className="flex-1">
                                                        <Text className="text-white font-semibold">{sale.customer_name}</Text>
                                                        {sale.vehicle_reg && (
                                                            <Text className="text-slate-500 text-xs mt-1">{sale.vehicle_reg}</Text>
                                                        )}
                                                    </View>
                                                    <Text className="text-amber-400 font-bold">{formatCurrency(sale.amount)}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : (
                            <View className="flex-1 items-center justify-center py-20">
                                <Text className="text-slate-400">Shift not found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});
