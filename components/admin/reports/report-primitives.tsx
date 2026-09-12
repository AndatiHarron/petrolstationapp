import React from 'react';
import { View, Text, ScrollView } from 'react-native';

/** Shared display pieces for the report screen, so every report reads alike. */

export function money(value: number): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function litres(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Headline figures on a single scrollable line.
 *
 * These were a wrapping two-column grid, which squeezed each figure into half a
 * phone's width and broke the row across two lines. One line that slides keeps
 * every tile wide enough to read its number, however many there are.
 */
export function TileRow({
    tiles,
}: {
    tiles: { label: string; value: string; tone?: 'neutral' | 'signed'; amount?: number }[];
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
            {tiles.map((tile) => {
                const signed = tile.tone === 'signed' && typeof tile.amount === 'number';
                const negative = signed && (tile.amount as number) < 0;

                return (
                    <View
                        key={tile.label}
                        style={{ minWidth: 152 }}
                        className="rounded-xl border border-surface-border bg-surface-sunken px-3.5 py-3"
                    >
                        <Text className="text-ink-faint text-[9px] font-bold uppercase tracking-wider">
                            {tile.label}
                        </Text>
                        <Text
                            className={`mt-1 font-mono text-base font-bold ${
                                signed ? (negative ? 'text-accent' : 'text-emerald-700') : 'text-ink'
                            }`}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                        >
                            {tile.value}
                        </Text>
                    </View>
                );
            })}
        </ScrollView>
    );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text className="text-ink-faint mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest">
            {children}
        </Text>
    );
}

/** Label/value pairs down a list — for splits and single-figure summaries. */
export function KeyValues({
    rows,
}: {
    rows: { label: string; value: string; signed?: number; total?: boolean }[];
}) {
    return (
        <View className="rounded-xl border border-surface-border">
            {rows.map((row, index) => {
                const negative = typeof row.signed === 'number' && row.signed < 0;
                return (
                    <View
                        key={row.label}
                        className={`flex-row items-baseline justify-between gap-3 px-4 py-2.5 ${
                            index < rows.length - 1 ? 'border-b border-surface-border' : ''
                        } ${row.total ? 'bg-surface-sunken' : ''}`}
                    >
                        <Text className={`text-xs ${row.total ? 'text-ink font-bold' : 'text-ink-muted'}`}>
                            {row.label}
                        </Text>
                        <Text
                            className={`shrink-0 font-mono text-xs ${
                                negative ? 'text-accent font-bold' : row.total ? 'text-brand font-bold' : 'text-ink font-semibold'
                            }`}
                        >
                            {row.value}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

/**
 * A horizontally scrollable table. Report tables have more columns than a phone
 * can show, so they scroll sideways in their own container rather than being
 * squeezed or clipped.
 */
export function DataTable({
    columns,
    rows,
    emptyMessage = 'Nothing to show',
}: {
    columns: { key: string; label: string; width: number; align?: 'left' | 'right' }[];
    rows: Record<string, { text: string; negative?: boolean; muted?: boolean }>[];
    emptyMessage?: string;
}) {
    if (rows.length === 0) {
        return (
            <View className="items-center rounded-xl bg-surface-sunken py-8">
                <Text className="text-ink-muted text-sm">{emptyMessage}</Text>
            </View>
        );
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="rounded-xl border border-surface-border">
                <View className="flex-row border-b-2 border-surface-border bg-surface-sunken">
                    {columns.map((column) => (
                        <Text
                            key={column.key}
                            style={{ width: column.width }}
                            className={`text-ink-faint px-3 py-2 text-[9px] font-bold uppercase tracking-wider ${
                                column.align === 'right' ? 'text-right' : ''
                            }`}
                        >
                            {column.label}
                        </Text>
                    ))}
                </View>

                {rows.map((row, index) => (
                    <View
                        key={index}
                        className={`flex-row ${index < rows.length - 1 ? 'border-b border-surface-border' : ''}`}
                    >
                        {columns.map((column) => {
                            const cell = row[column.key];
                            return (
                                <Text
                                    key={column.key}
                                    style={{ width: column.width }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit={column.align === 'right'}
                                    minimumFontScale={0.75}
                                    className={`px-3 py-2.5 text-[11px] ${
                                        column.align === 'right' ? 'text-right font-mono' : ''
                                    } ${
                                        cell?.negative
                                            ? 'text-accent font-bold'
                                            : cell?.muted
                                              ? 'text-ink-faint'
                                              : 'text-ink'
                                    }`}
                                >
                                    {cell?.text ?? '-'}
                                </Text>
                            );
                        })}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
