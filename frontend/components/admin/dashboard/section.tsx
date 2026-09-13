import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, Plus, type LucideIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SectionProps {
    title: string;
    subtitle?: string;
    /** A short action on the right of the header, e.g. "See all". */
    actionLabel?: string;
    onAction?: () => void;
    /** A plus button beside the header action, for creating a record here. */
    onAdd?: () => void;
    addLabel?: string;
    /** Stagger index — each section enters a beat after the one above it. */
    index?: number;
    /** Content that needs the card's full width, like a horizontal list. */
    bleed?: boolean;
    children: React.ReactNode;
}

/**
 * One card, one header, one radius.
 *
 * The dashboard had grown three radii, two paddings and a mix of carded and
 * bare blocks, so it read as several screens stitched together. Everything
 * built on this is uniform by construction rather than by matching by eye.
 *
 * `bleed` lets a horizontal list run to the card edges while the header keeps
 * its padding, which is what makes a scrolling row look intentional rather
 * than clipped.
 */
export function Section({
    title,
    subtitle,
    actionLabel,
    onAction,
    onAdd,
    addLabel = 'Add',
    index = 0,
    bleed = false,
    children,
}: SectionProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * 70)
                .duration(420)
                .springify()
                .damping(18)}
            className="rounded-2xl border border-surface-border bg-surface"
            style={{
                shadowColor: '#12121a',
                shadowOpacity: 0.04,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 1,
            }}
        >
            <View
                className={`flex-row items-start justify-between gap-3 px-4 pt-4 ${
                    bleed ? 'pb-3' : 'pb-2'
                }`}
            >
                <View className="min-w-0 flex-1">
                    <Text className="text-ink text-[15px] font-bold" numberOfLines={1}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text className="text-ink-faint mt-0.5 text-[11px]" numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>

                <View className="shrink-0 flex-row items-center gap-1.5">
                    {actionLabel && onAction ? (
                        <Pressable
                            onPress={onAction}
                            accessibilityRole="button"
                            hitSlop={8}
                            className="rounded-full bg-brand-subtle px-2.5 py-1 active:opacity-70"
                        >
                            <Text className="text-brand text-[10px] font-bold">{actionLabel}</Text>
                        </Pressable>
                    ) : null}

                    {onAdd ? (
                        <Pressable
                            onPress={onAdd}
                            accessibilityRole="button"
                            accessibilityLabel={addLabel}
                            hitSlop={8}
                            style={{ width: 26, height: 26, borderRadius: 9 }}
                            className="items-center justify-center bg-brand active:opacity-80"
                        >
                            <Plus size={14} color="#ffffff" />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            <View className={bleed ? 'pb-4' : 'px-4 pb-4'}>{children}</View>
        </Animated.View>
    );
}

/**
 * A figure with its label. The dashboard's basic unit of information.
 */
export function Stat({
    label,
    value,
    tone = 'ink',
    caption,
}: {
    label: string;
    value: string;
    tone?: 'ink' | 'brand' | 'good' | 'bad';
    caption?: string;
}) {
    const colour =
        tone === 'bad'
            ? 'text-accent'
            : tone === 'good'
              ? 'text-emerald-700'
              : tone === 'brand'
                ? 'text-brand'
                : 'text-ink';

    return (
        <View className="gap-0.5">
            <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-wider">
                {label}
            </Text>
            <Text
                className={`font-mono text-lg font-bold ${colour}`}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
            >
                {value}
            </Text>
            {caption ? (
                <Text className="text-ink-faint text-[10px]" numberOfLines={1}>
                    {caption}
                </Text>
            ) : null}
        </View>
    );
}

const TONE_TEXT = {
    ink: 'text-ink',
    brand: 'text-brand',
    bad: 'text-accent',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
} as const;

export type RowTone = keyof typeof TONE_TEXT;

export interface SectionRow {
    key: string;
    label: string;
    value: string;
    tone?: RowTone;
    /** A second line under the label — a product name, a station. */
    caption?: string;
    /** A tinted 28px tile on the left. */
    Icon?: LucideIcon;
    /** 0-1. Draws a slim bar under the row, for a level or a proportion. */
    fill?: number;
    /** Makes the row pressable and gives it a chevron. */
    onPress?: () => void;
}

/**
 * One row shape for the whole dashboard.
 *
 * The screen had three: centred stat tiles, bespoke tank cards with their own
 * badge colours and a 12px bar, and a plain label/value list. Everything routes
 * through this now, so a level, a price and a count all read the same and a row
 * that can be edited says so with a chevron.
 */
export function SectionRows({ rows }: { rows: SectionRow[] }) {
    return (
        <View className="overflow-hidden rounded-xl border border-surface-border">
            {rows.map((row, index) => {
                const Icon = row.Icon;
                const tone = row.tone ?? 'ink';

                const body = (
                    <>
                        <View className="flex-row items-center gap-2.5">
                            {Icon ? (
                                <View
                                    style={{ width: 28, height: 28, borderRadius: 9 }}
                                    className="shrink-0 items-center justify-center bg-brand-subtle"
                                >
                                    <Icon size={14} color="#040273" />
                                </View>
                            ) : null}

                            <View className="min-w-0 flex-1">
                                <Text className="text-ink text-[13px] font-semibold" numberOfLines={1}>
                                    {row.label}
                                </Text>
                                {row.caption ? (
                                    <Text className="text-ink-faint text-[10.5px]" numberOfLines={1}>
                                        {row.caption}
                                    </Text>
                                ) : null}
                            </View>

                            <Text
                                className={`shrink-0 font-mono text-[13px] font-bold ${TONE_TEXT[tone]}`}
                                style={{ maxWidth: '46%' }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {row.value}
                            </Text>

                            {row.onPress ? (
                                <ChevronRight size={14} color="#c9c9d8" />
                            ) : null}
                        </View>

                        {row.fill !== undefined ? (
                            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                <View
                                    className={`h-full rounded-full ${
                                        tone === 'bad'
                                            ? 'bg-accent'
                                            : tone === 'warn'
                                              ? 'bg-amber-500'
                                              : tone === 'good'
                                                ? 'bg-emerald-500'
                                                : 'bg-brand'
                                    }`}
                                    style={{ width: `${Math.max(Math.min(row.fill, 1), 0) * 100}%` }}
                                />
                            </View>
                        ) : null}
                    </>
                );

                const className = `px-3.5 py-2.5 ${
                    index < rows.length - 1 ? 'border-b border-surface-border' : ''
                }`;

                return row.onPress ? (
                    <Pressable
                        key={row.key}
                        onPress={row.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.label}, ${row.value}`}
                        className={`${className} active:bg-surface-sunken`}
                    >
                        {body}
                    </Pressable>
                ) : (
                    <View key={row.key} className={className}>
                        {body}
                    </View>
                );
            })}
        </View>
    );
}

/** The shared empty state, so every section says nothing the same way. */
export function SectionEmpty({ message }: { message: string }) {
    return (
        <View className="items-center rounded-xl bg-surface-sunken py-7">
            <Text className="text-ink-muted text-[13px]">{message}</Text>
        </View>
    );
}
