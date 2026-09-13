import React from 'react';
import { View } from 'react-native';
import { Cylinder } from 'lucide-react-native';
import { useTanksIndex } from '../../../features/api/tank/tank';
import type { TanksIndex200, TankResource } from '@/features/api/model';
import { Section, SectionEmpty, SectionRows, Stat, type RowTone } from './section';

const LITRES = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

/** Fill level is a status, so it keeps its own scale — as it does in Setup. */
function toneFor(level: number): RowTone {
    if (level < 0.2) return 'bad';
    if (level < 0.4) return 'warn';
    return 'good';
}

function RowSkeleton() {
    return (
        <View className="gap-2 rounded-lg bg-surface-sunken px-3.5 py-3">
            <View className="flex-row justify-between">
                <View className="h-3 w-28 rounded bg-surface-border" />
                <View className="h-3 w-14 rounded bg-surface-border" />
            </View>
            <View className="h-1.5 w-full rounded-full bg-surface-border" />
        </View>
    );
}

interface WetStockLevelsProps {
    index?: number;
    onAdd?: () => void;
    onEdit?: (tank: TankResource) => void;
}

/**
 * Tank levels.
 *
 * This used to be a horizontally scrolling row of cards with their own badge
 * colours, their own 12px bar and their own two summary tiles — three idioms
 * that existed nowhere else on the dashboard. It is the shared row now, with
 * the level as the bar under each tank, so a level, a price and a count all
 * read the same way down the screen.
 */
export function WetStockLevels({ index = 0, onAdd, onEdit }: WetStockLevelsProps) {
    const { data: tanksResponse, isLoading, isError } = useTanksIndex();

    const tanks: TankResource[] = (tanksResponse as unknown as TanksIndex200)?.data ?? [];

    const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity_liters, 0);
    const totalVolume = tanks.reduce((sum, t) => sum + t.current_volume, 0);
    const overall = totalCapacity > 0 ? totalVolume / totalCapacity : 0;
    const low = tanks.filter(
        (t) => t.capacity_liters > 0 && t.current_volume / t.capacity_liters <= 0.3
    );

    return (
        <Section
            title="Wet stock"
            subtitle="Tap a tank to adjust it"
            index={index}
            onAdd={onAdd}
            addLabel="Add tank"
        >
            {isLoading ? (
                <View className="gap-2">
                    {[1, 2, 3].map((i) => (
                        <RowSkeleton key={i} />
                    ))}
                </View>
            ) : isError ? (
                <SectionEmpty message="Could not load tanks" />
            ) : tanks.length === 0 ? (
                <SectionEmpty message="No tanks set up yet" />
            ) : (
                <>
                    {/* The two headline figures, on the dashboard's own Stat
                        primitive rather than a pair of one-off tiles. */}
                    <View className="mb-3 flex-row gap-3 rounded-xl bg-surface-sunken px-3.5 py-3">
                        <View className="flex-1">
                            <Stat
                                label="Total stock"
                                value={`${LITRES.format(totalVolume)} L`}
                                tone="brand"
                                caption={`${Math.round(overall * 100)}% of capacity`}
                            />
                        </View>
                        <View className="flex-1">
                            <Stat
                                label="Low stock"
                                value={`${low.length} tank${low.length === 1 ? '' : 's'}`}
                                tone={low.length > 0 ? 'bad' : 'good'}
                                caption={low.length > 0 ? 'Below 30%' : 'All healthy'}
                            />
                        </View>
                    </View>

                    <SectionRows
                        rows={tanks.map((tank) => {
                            const level =
                                tank.capacity_liters > 0
                                    ? Math.min(tank.current_volume / tank.capacity_liters, 1)
                                    : 0;

                            return {
                                key: tank.id,
                                label: tank.name,
                                Icon: Cylinder,
                                caption: [tank.product_name, tank.station_name]
                                    .filter(Boolean)
                                    .join(' · '),
                                value: `${LITRES.format(tank.current_volume)} / ${LITRES.format(tank.capacity_liters)} L`,
                                tone: toneFor(level),
                                fill: level,
                                onPress: onEdit ? () => onEdit(tank) : undefined,
                            };
                        })}
                    />
                </>
            )}
        </Section>
    );
}
