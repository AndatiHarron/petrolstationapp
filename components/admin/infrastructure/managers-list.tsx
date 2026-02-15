import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Users, UserPlus, Building2 } from 'lucide-react-native';
import { useUsersIndex } from '@/features/api/user/user';
import type { UserResource, UsersIndex200 } from '@/features/api/model';

function isManager(user: UserResource): boolean {
    const roles = user.roles;
    if (Array.isArray(roles)) {
        return roles.some(
            (r) => r === 'manager' || (typeof r === 'string' && r.toLowerCase() === 'manager')
        );
    }
    return false;
}

function ManagerCardSkeleton() {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="h-5 w-32 bg-slate-700 rounded mb-2 animate-pulse" />
                    <View className="h-3 w-40 bg-slate-700 rounded animate-pulse" />
                </View>
            </View>
        </View>
    );
}

const ManagerCard = memo(function ManagerCard({
    name,
    email,
    stationName,
}: {
    name: string;
    email: string;
    stationName: string | null;
}) {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                        <Users size={18} color="#94a3b8" />
                        <Text className="text-white font-semibold text-base ml-2">{name}</Text>
                    </View>
                    <Text className="text-slate-500 text-sm ml-6">{email}</Text>
                    {stationName ? (
                        <View className="flex-row items-center ml-6 mt-1">
                            <Building2 size={14} color="#64748b" />
                            <Text className="text-slate-400 text-xs ml-1">{stationName}</Text>
                        </View>
                    ) : (
                        <Text className="text-slate-500 text-xs ml-6 mt-1">Unassigned</Text>
                    )}
                </View>
                <View className="px-2.5 py-1 rounded-full bg-emerald-500/20">
                    <Text className="text-emerald-400 text-xs font-medium">Manager</Text>
                </View>
            </View>
        </View>
    );
});

interface ManagersListProps {
    onAddManager?: () => void;
}

export function ManagersList({ onAddManager }: ManagersListProps) {
    const { data: response, isLoading, refetch, isRefetching } = useUsersIndex();
    const allUsers: UserResource[] = (response as UsersIndex200 | undefined)?.data ?? [];
    const managers = allUsers.filter(isManager);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<UserResource>) => (
        <ManagerCard
            name={item.name}
            email={item.email}
            stationName={item.station_name ?? null}
        />
    ), []);

    const keyExtractor = useCallback((item: UserResource) => item.id, []);

    if (isLoading) {
        return (
            <View>
                <ManagerCardSkeleton />
                <ManagerCardSkeleton />
                <ManagerCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-slate-400 text-sm">
                    {managers.length} manager{managers.length !== 1 ? 's' : ''}
                </Text>
                {onAddManager ? (
                    <Pressable
                        onPress={onAddManager}
                        className="flex-row items-center px-3 py-2 bg-emerald-500 rounded-lg active:opacity-80"
                    >
                        <UserPlus size={16} color="#ffffff" />
                        <Text className="text-white font-medium text-sm ml-1">Add Manager</Text>
                    </Pressable>
                ) : null}
            </View>

            {managers.length === 0 ? (
                <View className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 items-center">
                    <Users size={48} color="#64748b" />
                    <Text className="text-slate-400 text-lg mt-4">No managers found</Text>
                    <Text className="text-slate-500 text-sm mt-1">
                        Create managers and assign them to stations
                    </Text>
                    {onAddManager ? (
                        <Pressable
                            onPress={onAddManager}
                            className="mt-4 bg-emerald-500 px-6 py-3 rounded-xl active:opacity-80"
                        >
                            <Text className="text-white font-semibold">Add Manager</Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : (
                <FlashList
                    data={managers}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    estimatedItemSize={80}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#94a3b8"
                        />
                    }
                />
            )}
        </View>
    );
}
