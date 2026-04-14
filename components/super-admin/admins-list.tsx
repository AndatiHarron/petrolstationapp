import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { UserPlus, Plus, Users } from 'lucide-react-native';
import { useUsersIndex } from '@/features/api/user/user';
import type { UserResource, UsersIndex200 } from '@/features/api/model';

function AdminCardSkeleton() {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="h-5 w-32 bg-slate-700 rounded mb-2" />
                    <View className="h-3 w-40 bg-slate-700 rounded" />
                </View>
            </View>
        </View>
    );
}

function isAdmin(user: UserResource): boolean {
    const roles = user.roles;
    if (Array.isArray(roles)) {
        return roles.some((r) => r === 'admin' || (typeof r === 'string' && r.toLowerCase() === 'admin'));
    }
    return false;
}

const AdminCard = memo(function AdminCard({ user }: { user: UserResource }) {
    return (
        <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                        <Users size={18} color="#94a3b8" />
                        <Text className="text-white font-semibold text-base ml-2">{user.name}</Text>
                    </View>
                    <Text className="text-slate-500 text-sm ml-6">{user.email}</Text>
                    {user.organization_name ? (
                        <Text className="text-slate-400 text-xs ml-6 mt-1">
                            {user.organization_name}
                        </Text>
                    ) : null}
                </View>
                <View className="px-2.5 py-1 rounded-full bg-orange-500/20">
                    <Text className="text-orange-400 text-xs font-medium">Admin</Text>
                </View>
            </View>
        </View>
    );
});

interface AdminsListProps {
    onAddAdmin: () => void;
}

export function AdminsList({ onAddAdmin }: AdminsListProps) {
    const { data: response, isLoading, refetch, isRefetching } = useUsersIndex();
    const allUsers: UserResource[] = (response as UsersIndex200 | undefined)?.data ?? [];
    const admins = allUsers.filter(isAdmin);

    const renderItem = useCallback(({ item }: ListRenderItemInfo<UserResource>) => (
        <AdminCard user={item} />
    ), []);

    const keyExtractor = useCallback((item: UserResource) => item.id, []);

    if (isLoading) {
        return (
            <View className="flex-1 mt-8">
                <View className="flex-row items-center justify-between mb-4">
                    <View>
                        <Text className="text-lg font-bold text-white">Admins</Text>
                        <Text className="text-slate-500 text-sm">Organization administrators</Text>
                    </View>
                </View>
                <AdminCardSkeleton />
                <AdminCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1 mt-8">
            <View className="flex-row items-center justify-between mb-4">
                <View>
                    <Text className="text-lg font-bold text-white">Admins</Text>
                    <Text className="text-slate-500 text-sm">Organization administrators</Text>
                </View>
                <Pressable
                    onPress={onAddAdmin}
                    className="flex-row items-center gap-2 bg-orange-500 px-4 py-2.5 rounded-xl active:bg-orange-600"
                >
                    <UserPlus size={18} color="#ffffff" />
                    <Text className="text-white font-semibold text-sm">Add Admin</Text>
                </Pressable>
            </View>

            <FlashList<UserResource>
                data={admins}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor="#94a3b8"
                    />
                }
                ListEmptyComponent={
                    <View className="py-12 items-center">
                        <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center mb-4">
                            <UserPlus size={32} color="#64748b" />
                        </View>
                        <Text className="text-slate-400 text-base font-medium">No admins yet</Text>
                        <Text className="text-slate-500 text-sm mt-1">
                            Create admins and assign them to organizations
                        </Text>
                        <Pressable
                            onPress={onAddAdmin}
                            className="mt-4 bg-orange-500 px-6 py-3 rounded-xl active:bg-orange-600"
                        >
                            <Text className="text-white font-semibold">Add Admin</Text>
                        </Pressable>
                    </View>
                }
            />
        </View>
    );
}
