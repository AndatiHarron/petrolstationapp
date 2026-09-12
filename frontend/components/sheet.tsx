import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';

interface SheetProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    /** Fraction of the screen the sheet may occupy. */
    maxHeight?: `${number}%`;
    /** Turn off the internal ScrollView when the body scrolls itself. */
    scroll?: boolean;
}

/**
 * The standard bottom sheet.
 *
 * Extracted because the app had grown two families of modal: newer ones as
 * bottom sheets with a tappable backdrop, older ones as full-height panels
 * styled with StyleSheet. Anything sharing this shell is uniform by
 * construction rather than by remembering to match.
 *
 * Two details are deliberate, both learned from a log-out sheet that would not
 * respond: the backdrop is a flex sibling occupying only the space above the
 * panel rather than an `absolute inset-0` overlay across it, and there is no
 * Reanimated layout animation, which inside a native Modal leaves touch targets
 * offset from where they are painted on Android.
 */
export function Sheet({
    visible,
    title,
    subtitle,
    onClose,
    children,
    maxHeight = '88%',
    scroll = true,
}: SheetProps) {
    if (!visible) return null;

    const body = scroll ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
            {children}
        </ScrollView>
    ) : (
        <View className="flex-1">{children}</View>
    );

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View
                    className="rounded-t-3xl border-t border-surface-border bg-surface"
                    style={{ maxHeight }}
                >
                    <View className="flex-row items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-base font-bold" numberOfLines={1}>
                                {title}
                            </Text>
                            {subtitle ? (
                                <Text className="text-ink-muted text-xs" numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            ) : null}
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

                    {body}
                </View>
            </View>
        </Modal>
    );
}

/** A bordered list of label/value pairs — the standard way a sheet shows detail. */
export function SheetRows({
    rows,
}: {
    rows: {
        label: string;
        value: string;
        mono?: boolean;
        emphasis?: boolean;
        /** Rendered instead of `value` when a row needs an icon or badge. */
        render?: React.ReactNode;
    }[];
}) {
    return (
        <View className="rounded-xl border border-surface-border">
            {rows.map((row, index) => (
                <View
                    key={row.label}
                    className={`flex-row items-baseline justify-between gap-3 px-4 py-3 ${
                        index < rows.length - 1 ? 'border-b border-surface-border' : ''
                    } ${row.emphasis ? 'bg-surface-sunken' : ''}`}
                >
                    <Text
                        className={`text-xs ${row.emphasis ? 'text-ink font-bold' : 'text-ink-muted'}`}
                    >
                        {row.label}
                    </Text>

                    {row.render ?? (
                        <Text
                            className={`shrink text-right text-xs ${row.mono ? 'font-mono' : ''} ${
                                row.emphasis ? 'text-brand font-bold' : 'text-ink font-semibold'
                            }`}
                            numberOfLines={row.mono ? 1 : 3}
                        >
                            {row.value}
                        </Text>
                    )}
                </View>
            ))}
        </View>
    );
}

/** The one figure a sheet leads with. */
export function SheetHeadline({
    label,
    value,
    tone = 'brand',
}: {
    label: string;
    value: string;
    tone?: 'brand' | 'accent' | 'ink';
}) {
    const colour =
        tone === 'accent' ? 'text-accent' : tone === 'ink' ? 'text-ink' : 'text-brand';

    return (
        <View className="rounded-xl bg-surface-sunken px-4 py-4">
            <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-wider">
                {label}
            </Text>
            <Text
                className={`mt-1 font-mono text-2xl font-bold ${colour}`}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
            >
                {value}
            </Text>
        </View>
    );
}

export function SheetSection({ children }: { children: React.ReactNode }) {
    return (
        <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
            {children}
        </Text>
    );
}
