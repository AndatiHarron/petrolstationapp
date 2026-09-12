import React, { useCallback, memo } from 'react';
import { Building2, MapPin } from 'lucide-react-native';
import { useStationsIndex } from '@/features/api/station/station';
import type { StationResource, StationsIndex200 } from '@/features/api/model';
import { EntityCard, EntityList, Meta, MetaRow } from './shell';

const StationCard = memo(function StationCard({
    station,
    onDelete,
    onEdit,
}: {
    station: StationResource;
    onDelete: (id: string) => void;
    onEdit: (station: StationResource) => void;
}) {
    const handleDelete = useCallback(() => onDelete(station.id), [station.id, onDelete]);
    const handleEdit = useCallback(() => onEdit(station), [station, onEdit]);

    return (
        <EntityCard
            Icon={Building2}
            title={station.name}
            badge={{
                label: station.is_active ? 'Active' : 'Inactive',
                tone: station.is_active ? 'success' : 'neutral',
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
        >
            {station.location ? (
                <MetaRow>
                    <Meta Icon={MapPin} text={station.location} />
                </MetaRow>
            ) : null}
        </EntityCard>
    );
});

interface StationsListProps {
    onAddStation?: () => void;
    onEditStation?: (station: StationResource) => void;
    onDeleteStation?: (id: string) => void;
}

export function StationsList({ onAddStation, onEditStation, onDeleteStation }: StationsListProps) {
    const { data: stationsResponse, isLoading, refetch, isRefetching } = useStationsIndex();

    const handleDelete = useCallback((id: string) => onDeleteStation?.(id), [onDeleteStation]);
    const handleEdit = useCallback(
        (station: StationResource) => onEditStation?.(station),
        [onEditStation]
    );

    const renderItem = useCallback(
        (item: StationResource) => (
            <StationCard station={item} onDelete={handleDelete} onEdit={handleEdit} />
        ),
        [handleDelete, handleEdit]
    );

    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];

    return (
        <EntityList
            items={stations}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            noun="station"
            addLabel="Add station"
            onAdd={onAddStation}
            Icon={Building2}
            emptyTitle="No stations yet"
            emptyHint="A station is where tanks, pumps and shifts belong."
        />
    );
}
