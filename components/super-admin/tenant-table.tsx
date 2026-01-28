import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MoreVertical, Fuel, CheckCircle2, AlertCircle, Clock } from 'lucide-react-native';
import { Tenant } from './mock-data';

interface TenantTableProps {
    data: Tenant[];
}

export function TenantTable({ data }: TenantTableProps) {
    const renderItem = ({ item }: { item: Tenant }) => {
        let StatusIcon = Clock;
        let statusColor = 'text-slate-400';
        let statusBg = 'bg-slate-700/50';
        let statusBorder = 'border-slate-600';

        if (item.status === 'active') {
            StatusIcon = CheckCircle2;
            statusColor = 'text-emerald-400';
            statusBg = 'bg-emerald-500/10';
            statusBorder = 'border-emerald-500/20';
        } else if (item.status === 'suspended') {
            StatusIcon = AlertCircle;
            statusColor = 'text-red-400';
            statusBg = 'bg-red-500/10';
            statusBorder = 'border-red-500/20';
        } else {
            StatusIcon = Clock;
            statusColor = 'text-amber-400';
            statusBg = 'bg-amber-500/10';
            statusBorder = 'border-amber-500/20';
        }

        return (
            <View className="flex-row items-center py-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                {/* Organization */}
                <View className="w-[250px] flex-row items-center gap-3 pl-6">
                    <View className="w-10 h-10 bg-slate-800 rounded-full items-center justify-center border border-slate-700">
                        <Fuel size={18} color="#cbd5e1" />
                    </View>
                    <View>
                        <Text className="text-white font-medium text-sm">{item.name}</Text>
                        <Text className="text-slate-500 text-xs">ID: {item.id}</Text>
                    </View>
                </View>

                {/* Owner */}
                <View className="w-[150px]">
                    <Text className="text-slate-300 text-sm">{item.ownerName}</Text>
                    <Text className="text-slate-500 text-xs">{item.ownerEmail}</Text>
                </View>

                {/* Status */}
                <View className="w-40">
                    <View className={`flex-row items-center self-start gap-1.5 px-2.5 py-1 rounded-full border ${statusBg} ${statusBorder}`}>
                        <StatusIcon size={12} className={statusColor} color={item.status === 'active' ? '#34d399' : item.status === 'suspended' ? '#f87171' : '#fbbf24'} />
                        <Text className={`text-xs font-medium capitalize ${statusColor}`}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <View className="w-32">
                    <Text className="text-slate-300 text-sm font-medium">{item.stationsCount} Stations</Text>
                </View>
                <View className="w-32">
                    <Text className="text-white text-sm font-medium">{item.revenue}</Text>
                </View>

                {/* Date */}
                <View className="w-32">
                    <Text className="text-slate-400 text-sm">{item.onboardedAt}</Text>
                </View>

                {/* Actions */}
                <View className="w-16 items-center pr-4">
                    <Pressable className="p-2 hover:bg-slate-700 rounded-lg">
                        <MoreVertical size={16} color="#94a3b8" />
                    </Pressable>
                </View>
            </View>
        );
    };

    const ListHeader = () => (
        <View className="flex-row py-3 bg-slate-800 border-y border-slate-700">
            <Text className="w-[250px] pl-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</Text>
            <Text className="w-[150px] text-xs font-semibold text-slate-400 uppercase tracking-wider">Owner</Text>
            <Text className="w-40 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</Text>
            <Text className="w-32 text-xs font-semibold text-slate-400 uppercase tracking-wider">Stations</Text>
            <Text className="w-32 text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</Text>
            <Text className="w-32 text-xs font-semibold text-slate-400 uppercase tracking-wider">Onboarded</Text>
            <Text className="w-16 pr-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden pb-2">
            {/* Table Header Wrapper */}
            {/* Table Header Wrapper - Responsive */}
            <View className="p-4 border-b border-slate-800 flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/30">
                <View>
                    <Text className="text-lg font-bold text-white">Registered Tenants</Text>
                    <Text className="text-slate-500 text-sm">Manage all independent petrol station organizations.</Text>
                </View>
                <View>
                    <Pressable className="bg-orange-500 px-4 py-2 rounded-lg shadow-lg shadow-orange-500/20 active:bg-orange-600">
                        <Text className="text-white font-semibold text-sm">+ Add Tenant</Text>
                    </Pressable>
                </View>
            </View>

            <View className="flex-1 min-h-[300px]">
                <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: 980 }}>
                    <View className="flex-1 w-full">
                        <FlashList
                            data={data}
                            renderItem={renderItem}
                            ListHeaderComponent={ListHeader}
                        />
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}
