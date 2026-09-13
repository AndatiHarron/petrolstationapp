import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { Building2, CalendarRange, Check, X } from 'lucide-react-native';
import { useStationsIndex } from '@/features/api/station/station';
import { DateRangePicker, displayRange } from '@/components/date-range-picker';
import type { StationsIndex200 } from '@/features/api/model';
import { type ReportFilters } from '@/features/reports';

interface ReportFilterBarProps {
    filters: ReportFilters;
    onChange: (filters: ReportFilters) => void;
    /** Hidden for a manager, who only ever sees their own station. */
    showStationFilter?: boolean;
}

/**
 * The one filter row above the report cards. Period and station are held by the
 * screen and passed to every report, so they all move together rather than each
 * card carrying its own controls.
 *
 * The period is a date range and nothing else. The row of presets that used to
 * sit here — this month, last 30 days, this year and the rest — guessed at the
 * boundaries people actually report on; picking the two dates says exactly what
 * is wanted, and the server takes the range from the start of the first day to
 * the end of the last, so every day in it counts as a full 24 hours.
 */
export function ReportFilterBar({
    filters,
    onChange,
    showStationFilter = true,
}: ReportFilterBarProps) {
    const [rangeOpen, setRangeOpen] = useState(false);
    const [stationOpen, setStationOpen] = useState(false);

    const { data: stationsResponse } = useStationsIndex();
    const stations = (stationsResponse as unknown as StationsIndex200 | undefined)?.data ?? [];

    const selectedStation = stations.find((station) => station.id === filters.station_id);

    const applyStation = (stationId?: string) => {
        onChange({ ...filters, station_id: stationId });
        setStationOpen(false);
    };

    return (
        <View className="mb-4 gap-2">
            <View className="flex-row gap-2">
                <Pressable
                    onPress={() => setRangeOpen(true)}
                    accessibilityRole="button"
                    className="flex-1 flex-row items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 active:bg-surface-sunken"
                >
                    <CalendarRange size={15} color="#040273" />
                    <View className="flex-1">
                        <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                            Period
                        </Text>
                        <Text className="text-ink text-xs font-semibold" numberOfLines={1}>
                            {displayRange(filters.start_date, filters.end_date)}
                        </Text>
                    </View>
                </Pressable>

                {showStationFilter && (
                    <Pressable
                        onPress={() => setStationOpen(true)}
                        accessibilityRole="button"
                        className="flex-1 flex-row items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 active:bg-surface-sunken"
                    >
                        <Building2 size={15} color="#040273" />
                        <View className="flex-1">
                            <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                                Station
                            </Text>
                            <Text className="text-ink text-xs font-semibold" numberOfLines={1}>
                                {selectedStation?.name ?? 'All stations'}
                            </Text>
                        </View>
                    </Pressable>
                )}
            </View>

            <DateRangePicker
                visible={rangeOpen}
                start={filters.start_date}
                end={filters.end_date}
                onClose={() => setRangeOpen(false)}
                onApply={(start, end) => {
                    onChange({ ...filters, start_date: start, end_date: end });
                    setRangeOpen(false);
                }}
            />

            <PickerSheet
                visible={stationOpen}
                title="Station"
                onClose={() => setStationOpen(false)}
                options={[
                    { id: '__all__', label: 'All stations', selected: !filters.station_id },
                    ...stations.map((station) => ({
                        id: station.id,
                        label: station.name,
                        selected: filters.station_id === station.id,
                    })),
                ]}
                onSelect={(id) => applyStation(id === '__all__' ? undefined : id)}
            />
        </View>
    );
}

// ─── Shared picker sheet ──────────────────────────────────────────

interface PickerOption {
    id: string;
    label: string;
    selected: boolean;
}

function PickerSheet({
    visible,
    title,
    options,
    onSelect,
    onClose,
}: {
    visible: boolean;
    title: string;
    options: PickerOption[];
    onSelect: (id: string) => void;
    onClose: () => void;
}) {
    if (!visible) return null;

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View className="rounded-t-3xl border-t border-surface-border bg-surface pb-8">
                    <View className="flex-row items-center justify-between border-b border-surface-border px-5 py-4">
                        <Text className="text-ink text-base font-bold">{title}</Text>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={8}
                            className="rounded-full bg-surface-sunken p-2"
                        >
                            <X size={16} color="#5c5c6b" />
                        </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 360 }}>
                        {options.map((option) => (
                            <Pressable
                                key={option.id}
                                onPress={() => onSelect(option.id)}
                                accessibilityRole="button"
                                className="flex-row items-center justify-between border-b border-surface-border px-5 py-4 active:bg-surface-sunken"
                            >
                                <Text
                                    className={`text-sm ${option.selected ? 'text-brand font-bold' : 'text-ink'}`}
                                    numberOfLines={1}
                                >
                                    {option.label}
                                </Text>
                                {option.selected && <Check size={16} color="#040273" />}
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
