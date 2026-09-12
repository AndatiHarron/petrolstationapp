import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { Building2, CalendarRange, Check, X } from 'lucide-react-native';
import { useStationsIndex } from '@/features/api/station/station';
import type { StationsIndex200 } from '@/features/api/model';
import {
    PERIOD_PRESETS,
    formatPeriod,
    resolvePeriod,
    type PeriodPresetId,
    type ReportFilters,
} from '@/features/reports';

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
 */
export function ReportFilterBar({
    filters,
    onChange,
    showStationFilter = true,
}: ReportFilterBarProps) {
    const [periodOpen, setPeriodOpen] = useState(false);
    const [stationOpen, setStationOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<PeriodPresetId>('this_month');

    const { data: stationsResponse } = useStationsIndex();
    const stations = (stationsResponse as unknown as StationsIndex200 | undefined)?.data ?? [];

    const selectedStation = stations.find((station) => station.id === filters.station_id);

    const applyPreset = (preset: PeriodPresetId) => {
        setActivePreset(preset);
        onChange({ ...filters, ...resolvePeriod(preset) });
        setPeriodOpen(false);
    };

    const applyStation = (stationId?: string) => {
        onChange({ ...filters, station_id: stationId });
        setStationOpen(false);
    };

    return (
        <View className="mb-4 gap-2">
            <View className="flex-row gap-2">
                <Pressable
                    onPress={() => setPeriodOpen(true)}
                    accessibilityRole="button"
                    className="flex-1 flex-row items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 active:bg-surface-sunken"
                >
                    <CalendarRange size={15} color="#040273" />
                    <View className="flex-1">
                        <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                            Period
                        </Text>
                        <Text className="text-ink text-xs font-semibold" numberOfLines={1}>
                            {formatPeriod(filters)}
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

            {/* Quick presets, so the common cases need no sheet at all. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                    {PERIOD_PRESETS.map((preset) => {
                        const active = activePreset === preset.id;
                        return (
                            <Pressable
                                key={preset.id}
                                onPress={() => applyPreset(preset.id)}
                                accessibilityRole="button"
                                className={`rounded-full border px-2.5 py-1 ${
                                    active
                                        ? 'border-brand bg-brand'
                                        : 'border-surface-border bg-surface active:bg-surface-sunken'
                                }`}
                            >
                                <Text
                                    className={`text-[10px] font-semibold ${
                                        active ? 'text-white' : 'text-ink-muted'
                                    }`}
                                >
                                    {preset.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>

            <PickerSheet
                visible={periodOpen}
                title="Reporting period"
                onClose={() => setPeriodOpen(false)}
                options={PERIOD_PRESETS.map((preset) => ({
                    id: preset.id,
                    label: preset.label,
                    selected: activePreset === preset.id,
                }))}
                onSelect={(id) => applyPreset(id as PeriodPresetId)}
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
