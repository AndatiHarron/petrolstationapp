import React, { useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

/**
 * A calendar range picker in plain React Native.
 *
 * No date-picker package is installed, and adding a native one would break
 * Expo Go. Typed fields were the alternative, but a two-tap calendar avoids the
 * ambiguity of whether 01/02 means January or February.
 */

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/** YYYY-MM-DD in local time; toISOString() would shift across UTC. */
function iso(year: number, month: number, day: number): string {
    return `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
}

/** The DD/MM/YYYY form used on screen. */
export function displayDate(value?: string): string {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
}

export function displayRange(start?: string, end?: string): string {
    if (!start || !end) return 'Select dates';
    return start === end ? displayDate(start) : `${displayDate(start)} - ${displayDate(end)}`;
}

/** Monday-first grid, padded so the 1st lands on its real weekday. */
function monthGrid(year: number, month: number): (number | null)[] {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(day);
    }
    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    return cells;
}

interface DateRangePickerProps {
    visible: boolean;
    start?: string;
    end?: string;
    onApply: (start: string, end: string) => void;
    onClose: () => void;
}

export function DateRangePicker({ visible, start, end, onApply, onClose }: DateRangePickerProps) {
    const today = new Date();
    const anchor = start ? new Date(`${start}T00:00:00`) : today;

    const [viewYear, setViewYear] = useState(anchor.getFullYear());
    const [viewMonth, setViewMonth] = useState(anchor.getMonth());
    const [from, setFrom] = useState<string | undefined>(start);
    const [to, setTo] = useState<string | undefined>(end);

    const cells = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

    if (!visible) return null;

    const step = (delta: number) => {
        const next = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(next.getFullYear());
        setViewMonth(next.getMonth());
    };

    const pick = (day: number) => {
        const picked = iso(viewYear, viewMonth, day);

        // First tap opens a new range; second closes it, swapping if picked
        // backwards so the user need not tap in order.
        if (!from || (from && to)) {
            setFrom(picked);
            setTo(undefined);
            return;
        }

        if (picked < from) {
            setTo(from);
            setFrom(picked);
        } else {
            setTo(picked);
        }
    };

    const state = (day: number) => {
        const value = iso(viewYear, viewMonth, day);
        const isStart = value === from;
        const isEnd = value === to;
        const inside = !!from && !!to && value > from && value < to;

        return { value, isStart, isEnd, inside, isToday: value === iso(today.getFullYear(), today.getMonth(), today.getDate()) };
    };

    // One date is a valid range: that day, start to end. The server takes the
    // range from the start of the first day to the end of the last, so a single
    // tap reports a full 24 hours rather than nothing at all.
    const rangeEnd = to ?? from;
    const complete = !!from;

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View className="rounded-t-3xl border-t border-surface-border bg-surface pb-8">
                    <View className="flex-row items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-[17px] font-bold">Choose dates</Text>
                            <Text className="text-ink-muted text-[11.5px]" numberOfLines={1}>
                                {from && to
                                    ? `${displayRange(from, to)} · full days`
                                    : from
                                      ? `${displayDate(from)} · tap an end date, or apply for this day`
                                      : 'Tap a day, or a start and an end'}
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={8}
                            className="shrink-0 rounded-full bg-surface-sunken p-2"
                        >
                            <X size={16} color="#5c5c6b" />
                        </Pressable>
                    </View>

                    {/* Month navigation */}
                    <View className="flex-row items-center justify-between px-4 py-3">
                        <Pressable
                            onPress={() => step(-1)}
                            accessibilityRole="button"
                            accessibilityLabel="Previous month"
                            hitSlop={8}
                            className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
                        >
                            <ChevronLeft size={20} color="#040273" />
                        </Pressable>

                        <Text className="text-ink text-sm font-bold">
                            {MONTHS[viewMonth]} {viewYear}
                        </Text>

                        <Pressable
                            onPress={() => step(1)}
                            accessibilityRole="button"
                            accessibilityLabel="Next month"
                            hitSlop={8}
                            className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
                        >
                            <ChevronRight size={20} color="#040273" />
                        </Pressable>
                    </View>

                    <View className="flex-row px-3">
                        {WEEKDAYS.map((weekday) => (
                            <Text
                                key={weekday}
                                className="text-ink-faint flex-1 text-center text-[10px] font-bold uppercase"
                            >
                                {weekday}
                            </Text>
                        ))}
                    </View>

                    <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6 }}>
                        <View className="flex-row flex-wrap">
                            {cells.map((day, index) => {
                                if (day === null) {
                                    return <View key={`pad-${index}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
                                }

                                const { isStart, isEnd, inside, isToday } = state(day);
                                const edge = isStart || isEnd;

                                return (
                                    <Pressable
                                        key={day}
                                        onPress={() => pick(day)}
                                        accessibilityRole="button"
                                        accessibilityLabel={displayDate(iso(viewYear, viewMonth, day))}
                                        style={{ width: `${100 / 7}%`, height: 40 }}
                                        className="items-center justify-center"
                                    >
                                        <View
                                            className={`h-9 w-9 items-center justify-center rounded-full ${
                                                edge ? 'bg-brand' : inside ? 'bg-brand-subtle' : ''
                                            }`}
                                        >
                                            <Text
                                                className={`text-[13px] ${
                                                    edge
                                                        ? 'text-white font-bold'
                                                        : inside
                                                          ? 'text-brand font-semibold'
                                                          : isToday
                                                            ? 'text-brand font-bold'
                                                            : 'text-ink'
                                                }`}
                                            >
                                                {day}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Two buttons of equal height, the way every other sheet in
                        the app ends: secondary on the left, primary on the right,
                        and the chosen range reported above rather than crammed
                        into the button's label. */}
                    <View className="mt-1 flex-row items-center gap-2.5 border-t border-surface-border px-5 pt-3.5">
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            className="h-12 flex-1 items-center justify-center rounded-xl border border-surface-border bg-surface-sunken active:opacity-70"
                        >
                            <Text className="text-ink text-sm font-bold">Cancel</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => complete && onApply(from as string, rangeEnd as string)}
                            disabled={!complete}
                            accessibilityRole="button"
                            className={`h-12 flex-1 items-center justify-center rounded-xl bg-brand ${
                                complete ? 'active:opacity-85' : 'opacity-40'
                            }`}
                        >
                            <Text className="text-[13px] font-bold uppercase tracking-wider text-white">
                                Apply
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
