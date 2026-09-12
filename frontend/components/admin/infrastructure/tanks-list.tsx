import React, { useCallback, memo } from 'react';
import { View, Text } from 'react-native';
import { Cylinder, Droplet, MapPin } from 'lucide-react-native';
import { useTanksIndex } from '@/features/api/tank/tank';
import type { TankResource, TanksIndex200 } from '@/features/api/model';
import { EntityCard, EntityList, Meta, MetaRow, type Tone } from './shell';

const LITRES = new Intl.NumberFormat('en-KE');

/** Fill level is a status, so it keeps its own scale of colours. */
function levelFor(percent: number): { bar: string; tone: Tone } {
    if (percent < 20) return { bar: 'bg-accent', tone: 'danger' };
    if (percent < 40) return { bar: 'bg-amber-500', tone: 'warn' };
    return { bar: 'bg-emerald-500', tone: 'success' };
}

const TankCard = memo(function TankCard({
    tank,
    onDelete,
    onEdit,
}: {
    tank: TankResource;
    onDelete: (id: string) => void;
    onEdit: (tank: TankResource) => void;
}) {
    const handleDelete = useCallback(() => onDelete(tank.id), [tank.id, onDelete]);
    const handleEdit = useCallback(() => onEdit(tank), [tank, onEdit]);

    const percent =
        tank.capacity_liters > 0
            ? Math.min((tank.current_volume / tank.capacity_liters) * 100, 100)
            : 0;
    const level = levelFor(percent);

    return (
        <EntityCard
            Icon={Cylinder}
            title={tank.name}
            badge={{ label: `${percent.toFixed(0)}%`, tone: level.tone, mono: true }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            footer={
                <>
                    <View className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <View
                            className={`h-full rounded-full ${level.bar}`}
                            style={{ width: `${percent}%` }}
                        />
                    </View>
                    <View className="mt-1.5 flex-row items-baseline justify-between gap-2">
                        <Text className="text-ink shrink font-mono text-[11.5px] font-bold" numberOfLines={1}>
                            {LITRES.format(Math.round(tank.current_volume))} L
                        </Text>
                        <Text className="text-ink-faint shrink text-[10.5px]" numberOfLines={1}>
                            of {LITRES.format(Math.round(tank.capacity_liters))} L capacity
                        </Text>
                    </View>
                </>
            }
        >
            <MetaRow>
                {tank.product_name ? <Meta Icon={Droplet} text={tank.product_name} tone="brand" /> : null}
                {tank.station_name ? <Meta Icon={MapPin} text={tank.station_name} /> : null}
            </MetaRow>
        </EntityCard>
    );
});

interface TanksListProps {
    onAddTank?: () => void;
    onEditTank?: (tank: TankResource) => void;
    onDeleteTank?: (id: string) => void;
}

export function TanksList({ onAddTank, onEditTank, onDeleteTank }: TanksListProps) {
    const { data: tanksResponse, isLoading, refetch, isRefetching } = useTanksIndex();

    const handleDelete = useCallback((id: string) => onDeleteTank?.(id), [onDeleteTank]);
    const handleEdit = useCallback((tank: TankResource) => onEditTank?.(tank), [onEditTank]);

    const renderItem = useCallback(
        (item: TankResource) => <TankCard tank={item} onDelete={handleDelete} onEdit={handleEdit} />,
        [handleDelete, handleEdit]
    );

    const tanks = (tanksResponse as TanksIndex200 | undefined)?.data ?? [];

    return (
        <EntityList
            items={tanks}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            noun="tank"
            addLabel="Add tank"
            onAdd={onAddTank}
            Icon={Cylinder}
            emptyTitle="No tanks yet"
            emptyHint="Tanks hold the stock that nozzles draw from."
        />
    );
}
