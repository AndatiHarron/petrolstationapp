import React from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Edit2, Plus, Trash2, type LucideIcon } from 'lucide-react-native';

/**
 * One card system for every Setup section.
 *
 * Stations, products, tanks, nozzles, suppliers and managers each grew their own
 * card, toolbar, empty state and skeleton, so the six tabs of one screen looked
 * like six screens — different paddings, different icon sizes, and add buttons in
 * emerald and sky blue with black labels on them. Everything here is shared, so a
 * section only supplies its data and the two or three facts that differ.
 */

const ICON_MUTED = '#5c5c6b';
const ICON_FAINT = '#8b8b99';
const BRAND = '#040273';
const ACCENT = '#bf0a30';

/** Tones a badge can carry. Green stays reserved for active/success. */
export type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'neutral';

const TONE_STYLES: Record<Tone, { bg: string; text: string }> = {
    brand: { bg: 'bg-brand-subtle', text: 'text-brand' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    warn: { bg: 'bg-amber-50', text: 'text-amber-700' },
    danger: { bg: 'bg-accent-subtle', text: 'text-accent' },
    neutral: { bg: 'bg-surface-sunken', text: 'text-ink-muted' },
};

/** A small state or figure pill. */
export function Badge({ label, tone = 'neutral', mono = false }: { label: string; tone?: Tone; mono?: boolean }) {
    const style = TONE_STYLES[tone];

    return (
        <View className={`shrink-0 rounded-full px-2.5 py-1 ${style.bg}`}>
            <Text
                className={`text-[10px] font-bold ${mono ? 'font-mono' : 'uppercase tracking-wider'} ${style.text}`}
                numberOfLines={1}
            >
                {label}
            </Text>
        </View>
    );
}

/** A labelled detail under a card's title. */
export function Meta({ Icon, text, tone = 'muted' }: { Icon: LucideIcon; text: string; tone?: 'muted' | 'brand' }) {
    return (
        <View className="min-w-0 max-w-full flex-row items-center gap-1">
            <Icon size={11} color={tone === 'brand' ? BRAND : ICON_MUTED} />
            <Text
                className={`shrink text-[11px] ${tone === 'brand' ? 'text-brand font-semibold' : 'text-ink-muted'}`}
                numberOfLines={2}
            >
                {text}
            </Text>
        </View>
    );
}

/** The row that holds a card's Meta items; wraps rather than clipping. */
export function MetaRow({ children }: { children: React.ReactNode }) {
    return <View className="mt-1.5 flex-row flex-wrap items-center gap-x-3 gap-y-1">{children}</View>;
}

interface EntityCardProps {
    Icon: LucideIcon;
    title: string;
    /** Short state or figure, shown to the right of the title. */
    badge?: { label: string; tone?: Tone; mono?: boolean };
    /** Meta rows and anything else that belongs under the title. */
    children?: React.ReactNode;
    /** Full-width content below the title block — a progress bar, say. */
    footer?: React.ReactNode;
    onEdit?: () => void;
    onDelete?: () => void;
    isDeleting?: boolean;
}

/**
 * The card every section renders.
 *
 * The controls sit on their own top row and the name has the full width of the
 * card beneath them. Sharing one row with a badge and two buttons left the name
 * about half the card wide, so "Kisii Service Station" broke across lines at an
 * arbitrary point; given the whole width it wraps only when it genuinely must.
 */
export function EntityCard({
    Icon,
    title,
    badge,
    children,
    footer,
    onEdit,
    onDelete,
    isDeleting = false,
}: EntityCardProps) {
    return (
        <View
            className="mb-2.5 overflow-hidden rounded-2xl border border-surface-border bg-surface"
            style={{
                shadowColor: '#12121a',
                shadowOpacity: 0.05,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 5 },
                elevation: 2,
            }}
        >
            <View className="p-4">
                <View className="mb-2.5 flex-row items-center justify-between gap-2">
                    <View
                        style={{ width: 38, height: 38, borderRadius: 13 }}
                        className="shrink-0 items-center justify-center bg-brand-subtle"
                    >
                        <Icon size={18} color={BRAND} />
                    </View>

                    <View className="min-w-0 flex-row items-center justify-end gap-1.5">
                        {badge ? <Badge {...badge} /> : null}

                        {onEdit ? (
                            <Pressable
                                onPress={onEdit}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit ${title}`}
                                hitSlop={6}
                                style={{ width: 32, height: 32, borderRadius: 11 }}
                                className="items-center justify-center bg-surface-sunken active:opacity-60"
                            >
                                <Edit2 size={14} color={BRAND} />
                            </Pressable>
                        ) : null}

                        {onDelete ? (
                            <Pressable
                                onPress={onDelete}
                                disabled={isDeleting}
                                accessibilityRole="button"
                                accessibilityLabel={`Delete ${title}`}
                                hitSlop={6}
                                style={{ width: 32, height: 32, borderRadius: 11 }}
                                className="items-center justify-center bg-accent-subtle active:opacity-60"
                            >
                                <Trash2 size={14} color={isDeleting ? ICON_FAINT : ACCENT} />
                            </Pressable>
                        ) : null}
                    </View>
                </View>

                {/* The name owns a full-width line of its own. */}
                <Text className="text-ink text-[16px] font-bold leading-[21px]">{title}</Text>

                {children}
            </View>

            {footer ? (
                <View className="border-t border-surface-border bg-surface-sunken px-4 py-3">
                    {footer}
                </View>
            ) : null}
        </View>
    );
}

/** The loading placeholder, shaped like the card above it. */
export function EntityCardSkeleton() {
    return (
        <View className="mb-2.5 rounded-2xl border border-surface-border bg-surface p-4">
            <View className="mb-2.5 flex-row items-center justify-between">
                <View style={{ width: 38, height: 38, borderRadius: 13 }} className="animate-pulse bg-surface-sunken" />
                <View style={{ width: 32, height: 32, borderRadius: 11 }} className="animate-pulse bg-surface-sunken" />
            </View>
            <View className="h-3.5 w-40 animate-pulse rounded bg-surface-border" />
            <View className="mt-2 h-2.5 w-28 animate-pulse rounded bg-surface-sunken" />
        </View>
    );
}

/** Count on the left, the one add action on the right. */
function Toolbar({
    count,
    noun,
    addLabel,
    onAdd,
}: {
    count: number;
    noun: string;
    addLabel: string;
    onAdd?: () => void;
}) {
    return (
        <View className="mb-3 flex-row items-center justify-between gap-3">
            <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                {count} {noun}
                {count === 1 ? '' : 's'}
            </Text>

            {onAdd ? (
                // Navy, not the emerald and sky fills these buttons used to
                // carry, and a white label rather than black on a colour.
                <Pressable
                    onPress={onAdd}
                    accessibilityRole="button"
                    className="flex-row items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 active:opacity-80"
                >
                    <Plus size={14} color="#ffffff" />
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-white">{addLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

/** Nothing here yet, with the way to change that. */
function Empty({
    Icon,
    title,
    hint,
    addLabel,
    onAdd,
}: {
    Icon: LucideIcon;
    title: string;
    hint: string;
    addLabel: string;
    onAdd?: () => void;
}) {
    return (
        <View className="items-center rounded-2xl border border-surface-border bg-surface px-6 py-10">
            <View
                style={{ width: 52, height: 52, borderRadius: 18 }}
                className="items-center justify-center bg-surface-sunken"
            >
                <Icon size={24} color={ICON_FAINT} />
            </View>
            <Text className="text-ink mt-3 text-[14px] font-bold">{title}</Text>
            <Text className="text-ink-muted mt-1 text-center text-[11.5px]">{hint}</Text>

            {onAdd ? (
                <Pressable
                    onPress={onAdd}
                    accessibilityRole="button"
                    className="mt-4 flex-row items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 active:opacity-80"
                >
                    <Plus size={14} color="#ffffff" />
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-white">{addLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

interface EntityListProps<T> {
    items: T[];
    isLoading: boolean;
    isRefetching: boolean;
    onRefresh: () => void;
    keyExtractor: (item: T) => string;
    renderItem: (item: T) => React.ReactElement;
    /** Singular noun for the count line — "station", "tank". */
    noun: string;
    addLabel: string;
    onAdd?: () => void;
    Icon: LucideIcon;
    emptyTitle: string;
    emptyHint: string;
}

/**
 * A whole section: toolbar, list, empty state and loading state.
 *
 * FlashList's estimatedItemSize is deliberately absent — this version measures
 * its own rows, and passing it was a type error in every list that did.
 */
export function EntityList<T>({
    items,
    isLoading,
    isRefetching,
    onRefresh,
    keyExtractor,
    renderItem,
    noun,
    addLabel,
    onAdd,
    Icon,
    emptyTitle,
    emptyHint,
}: EntityListProps<T>) {
    if (isLoading) {
        return (
            <View className="flex-1">
                <Toolbar count={0} noun={noun} addLabel={addLabel} onAdd={undefined} />
                <EntityCardSkeleton />
                <EntityCardSkeleton />
                <EntityCardSkeleton />
            </View>
        );
    }

    return (
        <View className="flex-1">
            <Toolbar count={items.length} noun={noun} addLabel={addLabel} onAdd={onAdd} />

            {items.length === 0 ? (
                <Empty Icon={Icon} title={emptyTitle} hint={emptyHint} addLabel={addLabel} onAdd={onAdd} />
            ) : (
                <FlashList
                    data={items}
                    renderItem={({ item }) => renderItem(item)}
                    keyExtractor={keyExtractor}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 28 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={onRefresh}
                            tintColor={BRAND}
                            colors={[BRAND]}
                        />
                    }
                />
            )}
        </View>
    );
}
