import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { formatPeriod, useCustomerStatement, type ReportFilters } from '@/features/reports';

interface CustomerStatementModalProps {
    customerId: string | null;
    customerName?: string;
    filters: ReportFilters;
    onClose: () => void;
}

function money(value: number): string {
    return `KES ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function CustomerStatementModal({
    customerId,
    customerName,
    filters,
    onClose,
}: CustomerStatementModalProps) {
    const { data, isLoading, isError } = useCustomerStatement(customerId, filters);

    if (!customerId) return null;

    const statement = data?.data;

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View
                    className="rounded-t-3xl border-t border-surface-border bg-surface"
                    style={{ maxHeight: '88%' }}
                >
                    <View className="flex-row items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-wider">
                                Customer statement
                            </Text>
                            <Text className="text-ink text-lg font-bold" numberOfLines={1}>
                                {statement?.customer.name ?? customerName ?? 'Customer'}
                            </Text>
                            <Text className="text-ink-muted text-xs">{formatPeriod(filters)}</Text>
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

                    {isLoading ? (
                        <View className="items-center py-16">
                            <ActivityIndicator color="#040273" />
                        </View>
                    ) : isError || !statement ? (
                        <View className="items-center px-5 py-16">
                            <Text className="text-accent text-sm font-semibold">Could not load statement</Text>
                            <Text className="text-ink-muted mt-1 text-xs">Pull down and try again.</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
                            {/* Running balance: the three figures the customer queries. */}
                            <View className="rounded-xl bg-surface-sunken p-4">
                                <Row label="Opening balance" value={money(statement.opening_balance)} />
                                <Row label="Charges this period" value={money(statement.period_charges)} />
                                <Row
                                    label="Closing balance"
                                    value={money(statement.closing_balance)}
                                    emphasis
                                />
                            </View>

                            <View className="rounded-xl bg-surface-sunken p-4">
                                <Row label="Credit limit" value={money(statement.customer.credit_limit)} />
                                <Row
                                    label="Current balance"
                                    value={money(statement.customer.current_balance)}
                                />
                                {statement.customer.tax_pin ? (
                                    <Row label="Tax PIN" value={statement.customer.tax_pin} />
                                ) : null}
                            </View>

                            <View>
                                <Text className="text-ink-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
                                    Credit sales ({statement.lines.length})
                                </Text>

                                {statement.lines.length === 0 ? (
                                    <View className="items-center rounded-xl bg-surface-sunken py-8">
                                        <Text className="text-ink-muted text-sm">
                                            No credit sales in this period
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="rounded-xl border border-surface-border">
                                        {statement.lines.map((line, index) => (
                                            <View
                                                key={line.id}
                                                className={`flex-row items-center justify-between gap-3 px-4 py-3 ${
                                                    index < statement.lines.length - 1
                                                        ? 'border-b border-surface-border'
                                                        : ''
                                                }`}
                                            >
                                                <View className="min-w-0 flex-1">
                                                    <Text className="text-ink text-sm font-semibold">
                                                        {shortDate(line.date)}
                                                        {line.vehicle_reg ? ` · ${line.vehicle_reg}` : ''}
                                                    </Text>
                                                    <Text
                                                        className="text-ink-faint text-[10px]"
                                                        numberOfLines={1}
                                                    >
                                                        {line.station_name ?? 'Unknown station'}
                                                        {line.shift_number ? ` · ${line.shift_number}` : ''}
                                                    </Text>
                                                </View>
                                                <Text className="text-ink shrink-0 font-mono text-sm font-bold">
                                                    {money(line.amount)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {statement.invoices.length > 0 ? (
                                <View>
                                    <Text className="text-ink-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
                                        Invoices ({statement.invoices.length})
                                    </Text>
                                    <View className="rounded-xl border border-surface-border">
                                        {statement.invoices.map((invoice, index) => (
                                            <View
                                                key={invoice.id}
                                                className={`flex-row items-center justify-between gap-3 px-4 py-3 ${
                                                    index < statement.invoices.length - 1
                                                        ? 'border-b border-surface-border'
                                                        : ''
                                                }`}
                                            >
                                                <View className="min-w-0 flex-1">
                                                    <Text className="text-ink font-mono text-sm font-semibold">
                                                        {invoice.invoice_number}
                                                    </Text>
                                                    <Text className="text-ink-faint text-[10px]">
                                                        {shortDate(invoice.date)}
                                                    </Text>
                                                </View>
                                                <Text className="text-ink shrink-0 font-mono text-sm font-bold">
                                                    {money(invoice.total_amount)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ) : null}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
    return (
        <View
            className={`flex-row items-baseline justify-between gap-3 py-2 ${
                emphasis ? 'mt-1 border-t border-rule pt-3' : ''
            }`}
            style={emphasis ? { borderTopWidth: 1, borderTopColor: '#c9c9d8' } : undefined}
        >
            <Text className={`text-xs ${emphasis ? 'text-ink font-bold' : 'text-ink-muted'}`}>
                {label}
            </Text>
            <Text
                className={`shrink-0 font-mono text-sm ${emphasis ? 'text-brand font-bold' : 'text-ink font-semibold'}`}
            >
                {value}
            </Text>
        </View>
    );
}
