import React, { useCallback, memo } from 'react';
import { View, Text } from 'react-native';
import { Cylinder, Droplet, Gauge, MapPin } from 'lucide-react-native';
import { useNozzlesIndex } from '@/features/api/nozzle/nozzle';
import type { NozzleResource, NozzlesIndex200 } from '@/features/api/model';
import { EntityCard, EntityList, Meta, MetaRow } from './shell';

const READING = new Intl.NumberFormat('en-KE', { useGrouping: true });

const NozzleCard = memo(function NozzleCard({
    nozzle,
    onDelete,
    onEdit,
}: {
    nozzle: NozzleResource;
    onDelete: (id: string) => void;
    onEdit: (nozzle: NozzleResource) => void;
}) {
    const handleDelete = useCallback(() => onDelete(nozzle.id), [nozzle.id, onDelete]);
    const handleEdit = useCallback(() => onEdit(nozzle), [nozzle, onEdit]);

    return (
        <EntityCard
            Icon={Gauge}
            title={nozzle.name}
            onEdit={handleEdit}
            onDelete={handleDelete}
        >
            <View className="mt-0.5 flex-row items-baseline gap-2">
                <Text
                    className="text-brand shrink font-mono text-[15px] font-bold"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                >
                    {READING.format(nozzle.current_reading)}
                </Text>
                <Text className="text-ink-faint shrink-0 text-[10px]">
                    {nozzle.digits}-digit counter
                </Text>
            </View>

            <MetaRow>
                {nozzle.product_name ? <Meta Icon={Droplet} text={nozzle.product_name} tone="brand" /> : null}
                {nozzle.tank_name ? <Meta Icon={Cylinder} text={nozzle.tank_name} /> : null}
                {nozzle.station_name ? <Meta Icon={MapPin} text={nozzle.station_name} /> : null}
            </MetaRow>
        </EntityCard>
    );
});

interface NozzlesListProps {
    onAddNozzle?: () => void;
    onEditNozzle?: (nozzle: NozzleResource) => void;
    onDeleteNozzle?: (id: string) => void;
}

export function NozzlesList({ onAddNozzle, onEditNozzle, onDeleteNozzle }: NozzlesListProps) {
    const { data: nozzlesResponse, isLoading, refetch, isRefetching } = useNozzlesIndex();

    const handleDelete = useCallback((id: string) => onDeleteNozzle?.(id), [onDeleteNozzle]);
    const handleEdit = useCallback((nozzle: NozzleResource) => onEditNozzle?.(nozzle), [onEditNozzle]);

    const renderItem = useCallback(
        (item: NozzleResource) => (
            <NozzleCard nozzle={item} onDelete={handleDelete} onEdit={handleEdit} />
        ),
        [handleDelete, handleEdit]
    );

    const nozzles = (nozzlesResponse as NozzlesIndex200 | undefined)?.data ?? [];

    return (
        <EntityList
            items={nozzles}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            noun="nozzle"
            addLabel="Add nozzle"
            onAdd={onAddNozzle}
            Icon={Gauge}
            emptyTitle="No nozzles yet"
            emptyHint="Nozzle readings are what a shift is reconciled against."
        />
    );
}
