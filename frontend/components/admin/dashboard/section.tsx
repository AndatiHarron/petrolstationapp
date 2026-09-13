import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SectionProps {
    title: string;
    subtitle?: string;
    /** A short action on the right of the header, e.g. "See all". */
    actionLabel?: string;
    onAction?: () => void;
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

                {actionLabel && onAction ? (
                    <Pressable
                        onPress={onAction}
                        accessibilityRole="button"
                        hitSlop={8}
                        className="shrink-0 rounded-full bg-brand-subtle px-2.5 py-1 active:opacity-70"
                    >
                        <Text className="text-brand text-[10px] font-bold">{actionLabel}</Text>
                    </Pressable>
                ) : null}
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

/** Rows of label and value inside a section. */
export function SectionRows({
    rows,
}: {
    rows: { key: string; label: string; value: string; tone?: 'ink' | 'brand' | 'bad' }[];
}) {
    return (
        <View className="rounded-xl border border-surface-border">
            {rows.map((row, index) => (
                <View
                    key={row.key}
                    className={`flex-row items-baseline justify-between gap-3 px-3.5 py-2.5 ${
                        index < rows.length - 1 ? 'border-b border-surface-border' : ''
                    }`}
                >
                    <Text className="text-ink-muted shrink text-[13px]" numberOfLines={1}>
                        {row.label}
                    </Text>
                    <Text
                        className={`shrink-0 font-mono text-[13px] font-bold ${
                            row.tone === 'bad'
                                ? 'text-accent'
                                : row.tone === 'brand'
                                  ? 'text-brand'
                                  : 'text-ink'
                        }`}
                        style={{ maxWidth: '55%' }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {row.value}
                    </Text>
                </View>
            ))}
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
