import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, Plus, type LucideIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * The super-admin screen's card and row.
 *
 * Both lists here previously carried their own header: a two-line text block
 * beside an orange "Add Organization" button, neither of which could shrink.
 * On a phone the button ran off the card — which is what "cropped and
 * misplaced" was. The title takes the space that is left and the action is a
 * fixed-size icon button, so nothing can push anything off the edge.
 */

const BRAND = '#040273';

interface PanelProps {
    title: string;
    subtitle?: string;
    count?: number;
    Icon: LucideIcon;
    addLabel: string;
    onAdd: () => void;
    index?: number;
    children: React.ReactNode;
}

export function Panel({
    title,
    subtitle,
    count,
    Icon,
    addLabel,
    onAdd,
    index = 0,
    children,
}: PanelProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * 70)
                .duration(420)
                .springify()
                .damping(18)}
            className="rounded-2xl border border-surface-border bg-surface"
            style={{
                shadowColor: '#12121a',
                shadowOpacity: 0.05,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 5 },
                elevation: 2,
            }}
        >
            <View className="flex-row items-center gap-2.5 border-b border-surface-border px-4 py-3">
                <View
                    style={{ width: 34, height: 34, borderRadius: 12 }}
                    className="shrink-0 items-center justify-center bg-brand-subtle"
                >
                    <Icon size={16} color={BRAND} />
                </View>

                {/* min-w-0 + flex-1 is what stops the title shoving the button
                    past the card's edge. */}
                <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                        <Text className="text-ink shrink text-[15px] font-bold" numberOfLines={1}>
                            {title}
                        </Text>
                        {count !== undefined ? (
                            <View className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-0.5">
                                <Text className="text-ink-muted text-[10px] font-bold">{count}</Text>
                            </View>
                        ) : null}
                    </View>
                    {subtitle ? (
                        <Text className="text-ink-faint text-[10.5px]" numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>

                <Pressable
                    onPress={onAdd}
                    accessibilityRole="button"
                    accessibilityLabel={addLabel}
                    hitSlop={8}
                    style={{ width: 30, height: 30, borderRadius: 10 }}
                    className="shrink-0 items-center justify-center bg-brand active:opacity-80"
                >
                    <Plus size={15} color="#ffffff" />
                </Pressable>
            </View>

            <View className="p-3">{children}</View>
        </Animated.View>
    );
}

export type RowTone = 'neutral' | 'good' | 'bad';

const TONE = {
    neutral: { bg: 'bg-surface-sunken', text: 'text-ink-muted' },
    good: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    bad: { bg: 'bg-accent-subtle', text: 'text-accent' },
} as const;

interface PanelRowProps {
    title: string;
    caption?: string;
    meta?: string;
    badge?: { label: string; tone?: RowTone };
    onPress?: () => void;
}

/** One row, shared by both lists so a tenant and an administrator read alike. */
export function PanelRow({ title, caption, meta, badge, onPress }: PanelRowProps) {
    const body = (
        <View className="flex-row items-center gap-2.5">
            <View className="min-w-0 flex-1">
                <Text className="text-ink text-[14px] font-bold" numberOfLines={1}>
                    {title}
                </Text>
                {caption ? (
                    <Text className="text-ink-muted text-[11px]" numberOfLines={1}>
                        {caption}
                    </Text>
                ) : null}
                {meta ? (
                    <Text className="text-ink-faint text-[10px]" numberOfLines={1}>
                        {meta}
                    </Text>
                ) : null}
            </View>

            {badge ? (
                <View
                    className={`shrink-0 rounded-full px-2.5 py-1 ${TONE[badge.tone ?? 'neutral'].bg}`}
                >
                    <Text
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                            TONE[badge.tone ?? 'neutral'].text
                        }`}
                    >
                        {badge.label}
                    </Text>
                </View>
            ) : null}

            {onPress ? <ChevronRight size={14} color="#c9c9d8" /> : null}
        </View>
    );

    const shell = 'rounded-xl border border-surface-border px-3.5 py-3';

    return onPress ? (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
            className={`${shell} active:bg-surface-sunken`}
        >
            {body}
        </Pressable>
    ) : (
        <View className={shell}>{body}</View>
    );
}

export function PanelEmpty({ message, hint }: { message: string; hint?: string }) {
    return (
        <View className="items-center rounded-xl bg-surface-sunken px-5 py-8">
            <Text className="text-ink text-[13.5px] font-bold">{message}</Text>
            {hint ? (
                <Text className="text-ink-muted mt-1 text-center text-[11.5px]">{hint}</Text>
            ) : null}
        </View>
    );
}

export function PanelSkeleton() {
    return (
        <View className="gap-2">
            {[1, 2, 3].map((i) => (
                <View key={i} className="rounded-xl border border-surface-border px-3.5 py-3">
                    <View className="h-3 w-36 rounded bg-surface-border" />
                    <View className="mt-2 h-2.5 w-24 rounded bg-surface-sunken" />
                </View>
            ))}
        </View>
    );
}
