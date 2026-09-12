import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Building2, Plus } from 'lucide-react-native';
import { useOrganizationsIndex } from '@/features/api/organization/organization';
import type { OrganizationResource, OrganizationsIndex200 } from '@/features/api/model';

function OrganizationCardSkeleton() {
    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="h-5 w-40 bg-surface-border rounded mb-2" />
                    <View className="h-3 w-24 bg-surface-border rounded" />
                </View>
                <View className="h-6 w-20 bg-surface-border rounded-full" />
            </View>
        </View>
    );
}

const OrganizationCard = memo(function OrganizationCard({
    organization,
}: {
    organization: OrganizationResource;
}) {
    const statusColor = organization.status === 'active' ? 'bg-emerald-500/20' : 'bg-surface-border';
    const statusTextColor = organization.status === 'active' ? 'text-emerald-400' : 'text-ink-muted';

    return (
        <View className="bg-surface border border-surface-border rounded-xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                        <Building2 size={18} color="#8b8b99" />
                        <Text className="text-ink font-semibold text-base ml-2">{organization.name}</Text>
                    </View>
                    <Text className="text-ink-muted text-xs ml-6">{organization.slug}</Text>
                    {organization.created_at ? (
                        <Text className="text-ink-muted text-xs ml-6 mt-1">
                            Created {new Date(organization.created_at).toLocaleDateString()}
                        </Text>
                    ) : null}
                </View>
                <View className={`px-2.5 py-1 rounded-full ${statusColor}`}>
                    <Text className={`text-xs font-medium capitalize ${statusTextColor}`}>
                        {organization.status}
                    </Text>
                </View>
            </View>
        </View>
    );
});

interface TenantTableProps {
    onAddOrganization: () => void;
}

export function TenantTable({ onAddOrganization }: TenantTableProps) {
    const { data: response, isLoading, refetch, isRefetching } = useOrganizationsIndex();
    const organizations: OrganizationResource[] = (response as OrganizationsIndex200 | undefined)?.data ?? [];

    const renderItem = useCallback(({ item }: ListRenderItemInfo<OrganizationResource>) => (
        <OrganizationCard organization={item} />
    ), []);

    const keyExtractor = useCallback((item: OrganizationResource) => item.id, []);

    if (isLoading) {
        return (
            <View className="flex-1">
                <View className="flex-row items-center justify-between mb-4">
                    <View>
                        <Text className="text-lg font-bold text-ink">Organizations</Text>
                        <Text className="text-ink-muted text-sm">Manage tenant organizations</Text>
                    </View>
                </View>
                <OrganizationCardSkeleton />
                <OrganizationCardSkeleton />
                <OrganizationCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            <View className="flex-row items-center justify-between mb-4">
                <View>
                    <Text className="text-lg font-bold text-ink">Organizations</Text>
                    <Text className="text-ink-muted text-sm">Manage tenant organizations</Text>
                </View>
                <Pressable
                    onPress={onAddOrganization}
                    className="flex-row items-center gap-2 bg-orange-500 px-4 py-2.5 rounded-xl active:bg-orange-600"
                >
                    <Plus size={18} color="#ffffff" />
                    <Text className="text-ink font-semibold text-sm">Add Organization</Text>
                </Pressable>
            </View>

            <FlashList<OrganizationResource>
                data={organizations}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor="#8b8b99"
                    />
                }
                ListEmptyComponent={
                    <View className="py-12 items-center">
                        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center mb-4">
                            <Building2 size={32} color="#5c5c6b" />
                        </View>
                        <Text className="text-ink-muted text-base font-medium">No organizations yet</Text>
                        <Text className="text-ink-muted text-sm mt-1">Add your first organization to get started</Text>
                        <Pressable
                            onPress={onAddOrganization}
                            className="mt-4 bg-orange-500 px-6 py-3 rounded-xl active:bg-orange-600"
                        >
                            <Text className="text-ink font-semibold">Add Organization</Text>
                        </Pressable>
                    </View>
                }
            />
        </View>
    );
}
