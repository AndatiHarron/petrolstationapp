import React, { useCallback, memo } from 'react';
import { Building2, Mail, Users } from 'lucide-react-native';
import { useUsersIndex } from '@/features/api/user/user';
import type { UserResource, UsersIndex200 } from '@/features/api/model';
import { EntityCard, EntityList, Meta, MetaRow } from './shell';

function isManager(user: UserResource): boolean {
    const roles = user.roles;
    if (Array.isArray(roles)) {
        return roles.some(
            (r) => r === 'manager' || (typeof r === 'string' && r.toLowerCase() === 'manager')
        );
    }
    return false;
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
        <EntityCard
            Icon={Users}
            title={name}
            badge={
                stationName
                    ? { label: 'Assigned', tone: 'success' }
                    : { label: 'Unassigned', tone: 'neutral' }
            }
        >
            <MetaRow>
                <Meta Icon={Mail} text={email} />
                {stationName ? <Meta Icon={Building2} text={stationName} /> : null}
            </MetaRow>
        </EntityCard>
    );
});

interface ManagersListProps {
    onAddManager?: () => void;
}

export function ManagersList({ onAddManager }: ManagersListProps) {
    const { data: response, isLoading, refetch, isRefetching } = useUsersIndex();

    const allUsers: UserResource[] = (response as UsersIndex200 | undefined)?.data ?? [];
    const managers = allUsers.filter(isManager);

    const renderItem = useCallback(
        (item: UserResource) => (
            <ManagerCard name={item.name} email={item.email} stationName={item.station_name ?? null} />
        ),
        []
    );

    return (
        <EntityList
            items={managers}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            noun="manager"
            addLabel="Add manager"
            onAdd={onAddManager}
            Icon={Users}
            emptyTitle="No managers yet"
            emptyHint="Managers run shifts at the station you assign them to."
        />
    );
}
