import React, { useCallback, useState } from 'react';
import { View, Text, Alert, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Users } from 'lucide-react-native';
import { useOrganizationsIndex } from '@/features/api/organization/organization';
import { useUsersIndex } from '@/features/api/user/user';
import { useDeleteOrganization } from '@/features/organizations';
import { getApiErrorMessage } from '@/lib/api-error';
import { OrganizationSheet } from '../../components/super-admin/organization-sheet';
import { CreateAdminModal } from '../../components/super-admin/create-admin-modal';
import { Panel, PanelEmpty, PanelRow, PanelSkeleton } from '../../components/super-admin/panel';
import type {
    OrganizationResource,
    OrganizationsIndex200,
    UserResource,
    UsersIndex200,
} from '@/features/api/model';

function isAdmin(user: UserResource): boolean {
    const roles = user.roles;

    return Array.isArray(roles)
        ? roles.some((r) => typeof r === 'string' && r.toLowerCase() === 'admin')
        : false;
}

/**
 * The platform owner's screen.
 *
 * It used to nest two FlashLists inside a ScrollView, each with `flex-1` — a
 * virtualised list inside a scroll view has no bounded height to measure
 * against, which is why the lists rendered short and the headers sat oddly.
 * Both lists are plain maps inside one ScrollView now: a platform has tens of
 * tenants, not thousands, so there is nothing to virtualise.
 */
export default function SuperAdminDashboard() {
    const queryClient = useQueryClient();

    const {
        data: organizationsResponse,
        isLoading: organizationsLoading,
        isRefetching,
        refetch,
    } = useOrganizationsIndex();
    const { data: usersResponse, isLoading: usersLoading } = useUsersIndex();

    const organizations: OrganizationResource[] =
        (organizationsResponse as OrganizationsIndex200 | undefined)?.data ?? [];
    const admins: UserResource[] = (
        (usersResponse as UsersIndex200 | undefined)?.data ?? []
    ).filter(isAdmin);

    const [orgSheet, setOrgSheet] = useState<{
        open: boolean;
        organization?: OrganizationResource;
    }>({ open: false });
    const [adminSheetOpen, setAdminSheetOpen] = useState(false);

    const deleteOrganization = useDeleteOrganization();

    const confirmDelete = useCallback(
        (organization: OrganizationResource) => {
            Alert.alert(
                `Delete ${organization.name}?`,
                'Only an organization holding no staff, stations or shifts can be deleted. This cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                            deleteOrganization.mutate(organization.id, {
                                onSuccess: () => setOrgSheet({ open: false }),
                                // The server refuses a populated tenant and says
                                // what it holds; that message is the useful one.
                                onError: (error) =>
                                    Alert.alert(
                                        'Could not delete organization',
                                        getApiErrorMessage(error)
                                    ),
                            }),
                    },
                ]
            );
        },
        [deleteOrganization]
    );

    const onRefresh = useCallback(async () => {
        await queryClient.invalidateQueries();
    }, [queryClient]);

    return (
        <View className="flex-1 bg-surface-sunken">
            <StatusBar style="dark" backgroundColor="#f7f7fa" />
            <SafeAreaView className="flex-1" edges={['left', 'right']}>
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        paddingBottom: 44,
                        gap: 12,
                    }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching && !organizationsLoading}
                            onRefresh={onRefresh}
                            tintColor="#040273"
                            colors={['#040273']}
                        />
                    }
                >
                    <View>
                        <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                            Platform
                        </Text>
                        <Text className="text-ink text-[22px] font-bold">Organizations</Text>
                        <Text className="text-ink-muted mt-0.5 text-[12px]">
                            Tenants and the administrators who run them
                        </Text>
                    </View>

                    <Panel
                        title="Organizations"
                        subtitle="Tap one to rename or retire it"
                        count={organizations.length}
                        Icon={Building2}
                        addLabel="Add organization"
                        onAdd={() => setOrgSheet({ open: true })}
                        index={0}
                    >
                        {organizationsLoading ? (
                            <PanelSkeleton />
                        ) : organizations.length === 0 ? (
                            <PanelEmpty
                                message="No organizations yet"
                                hint="Add the first tenant to get started."
                            />
                        ) : (
                            <View className="gap-2">
                                {organizations.map((organization) => (
                                    <PanelRow
                                        key={organization.id}
                                        title={organization.name}
                                        caption={organization.slug}
                                        meta={
                                            organization.created_at
                                                ? `Created ${new Date(organization.created_at).toLocaleDateString()}`
                                                : undefined
                                        }
                                        badge={{
                                            label: organization.status,
                                            tone:
                                                organization.status === 'active'
                                                    ? 'good'
                                                    : 'neutral',
                                        }}
                                        onPress={() => setOrgSheet({ open: true, organization })}
                                    />
                                ))}
                            </View>
                        )}
                    </Panel>

                    <Panel
                        title="Administrators"
                        subtitle="One per organization, at least"
                        count={admins.length}
                        Icon={Users}
                        addLabel="Add administrator"
                        onAdd={() => setAdminSheetOpen(true)}
                        index={1}
                    >
                        {usersLoading ? (
                            <PanelSkeleton />
                        ) : admins.length === 0 ? (
                            <PanelEmpty
                                message="No administrators yet"
                                hint="An organization needs one to be usable."
                            />
                        ) : (
                            <View className="gap-2">
                                {admins.map((admin) => (
                                    <PanelRow
                                        key={admin.id}
                                        title={admin.name}
                                        caption={admin.email}
                                        meta={admin.organization_name ?? 'No organization'}
                                    />
                                ))}
                            </View>
                        )}
                    </Panel>
                </ScrollView>
            </SafeAreaView>

            <OrganizationSheet
                visible={orgSheet.open}
                organization={orgSheet.organization}
                onClose={() => setOrgSheet({ open: false })}
                onDelete={confirmDelete}
            />

            <CreateAdminModal
                visible={adminSheetOpen}
                onClose={() => setAdminSheetOpen(false)}
            />
        </View>
    );
}
