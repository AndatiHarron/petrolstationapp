import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { toast } from 'sonner-native';
import {
    SETTLEMENT_METHODS,
    useApproveSupplierPayment,
    useRecordSupplierPayment,
    useRejectSupplierPayment,
    useSupplierSettlements,
    type SettlementMethod,
    type SettlementStatus,
    type SupplierSettlement,
} from '@/features/settlements';
import { Sheet } from '@/components/sheet';
import { getApiErrorMessage } from '@/lib/api-error';

function money(value: number): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const METHOD_LABELS: Record<string, string> = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
    bank: 'Bank',
    cheque: 'Cheque',
};

const STATUS_STYLES: Record<SettlementStatus, { pill: string; text: string; label: string }> = {
    PENDING: { pill: 'bg-amber-50', text: 'text-amber-700', label: 'Awaiting approval' },
    APPROVED: { pill: 'bg-emerald-50', text: 'text-emerald-700', label: 'Paid' },
    REJECTED: { pill: 'bg-accent-subtle', text: 'text-accent', label: 'Rejected' },
};

/**
 * Payments made to suppliers, awaiting or carrying an admin decision.
 *
 * Same rule as customer credit: whoever releases the money records it, an admin
 * confirms it went out, and only then does the supplier balance come down.
 */
export function SupplierPayments() {
    const { data, isLoading, isError, refetch } = useSupplierSettlements();
    const { mutateAsync: approve, isPending: approving } = useApproveSupplierPayment();
    const [rejecting, setRejecting] = useState<SupplierSettlement | null>(null);

    const settlements = data?.data ?? [];
    const pendingCount = settlements.filter((settlement) => settlement.status === 'PENDING').length;

    const onApprove = async (settlement: SupplierSettlement) => {
        try {
            await approve(settlement.id);
            toast.success('Payment approved', {
                description: `${settlement.supplier_name} is now owed ${money(
                    Math.max(settlement.supplier_balance - settlement.amount, 0)
                )}.`,
            });
        } catch (error) {
            toast.error('Could not approve', { description: getApiErrorMessage(error) });
        }
    };

    return (
        <View className="mb-6">
            <View className="mb-1 flex-row items-center gap-2">
                <Text className="text-ink text-xl font-bold">Supplier payments</Text>
                {pendingCount > 0 ? (
                    <View className="rounded-full bg-amber-50 px-2 py-0.5">
                        <Text className="text-amber-700 text-xs font-bold">{pendingCount}</Text>
                    </View>
                ) : null}
            </View>
            <Text className="text-ink-muted mb-3 text-xs">
                Approving confirms the money went out and reduces what is owed.
            </Text>

            {isLoading ? (
                <View className="items-center py-10">
                    <ActivityIndicator color="#040273" />
                </View>
            ) : isError ? (
                <Pressable
                    onPress={() => refetch()}
                    accessibilityRole="button"
                    className="items-center rounded-xl bg-accent-subtle py-8 active:opacity-80"
                >
                    <Text className="text-accent text-sm font-bold">Could not load payments</Text>
                    <Text className="text-ink-muted mt-1 text-xs">Tap to try again.</Text>
                </Pressable>
            ) : settlements.length === 0 ? (
                <View className="items-center rounded-xl bg-surface-sunken py-8">
                    <Text className="text-ink-muted text-sm">No supplier payments yet</Text>
                </View>
            ) : (
                <View className="gap-2">
                    {settlements.map((settlement) => {
                        const status = STATUS_STYLES[settlement.status];
                        const isPending = settlement.status === 'PENDING';

                        const from = isPending
                            ? settlement.supplier_balance
                            : (settlement.balance_before ?? settlement.supplier_balance);
                        const to = isPending
                            ? Math.max(settlement.supplier_balance - settlement.amount, 0)
                            : (settlement.balance_after ?? from);

                        return (
                            <View
                                key={settlement.id}
                                className="rounded-xl border border-surface-border bg-surface p-4"
                            >
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="min-w-0 flex-1">
                                        <Text className="text-ink text-sm font-bold" numberOfLines={1}>
                                            {settlement.supplier_name ?? 'Supplier'}
                                        </Text>
                                        <Text className="text-ink-faint text-[11px]" numberOfLines={1}>
                                            {METHOD_LABELS[settlement.method] ?? settlement.method}
                                            {settlement.reference ? ` · ${settlement.reference}` : ''}
                                        </Text>
                                    </View>
                                    <Text
                                        className="text-ink font-mono text-base font-bold"
                                        style={{ maxWidth: '46%' }}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                    >
                                        {money(settlement.amount)}
                                    </Text>
                                </View>

                                <View className="mt-2 flex-row items-center gap-2">
                                    <View className={`rounded-full px-2 py-0.5 ${status.pill}`}>
                                        <Text
                                            className={`text-[9px] font-bold uppercase tracking-wider ${status.text}`}
                                        >
                                            {status.label}
                                        </Text>
                                    </View>
                                    {settlement.approved_by ? (
                                        <Text className="text-ink-faint text-[10px]" numberOfLines={1}>
                                            by {settlement.approved_by}
                                        </Text>
                                    ) : null}
                                </View>

                                {/* Figures on their own line: a label plus two
                                    amounts and an arrow will not fit one row. */}
                                <View className="mt-3 rounded-lg bg-surface-sunken px-3 py-2">
                                    <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-wider">
                                        {isPending
                                            ? 'Owed after'
                                            : settlement.status === 'APPROVED'
                                              ? 'Owed moved'
                                              : 'Owed unchanged'}
                                    </Text>

                                    {settlement.status === 'REJECTED' ? (
                                        <Text className="text-ink-muted mt-0.5 font-mono text-xs font-bold">
                                            {money(settlement.supplier_balance)}
                                        </Text>
                                    ) : (
                                        <View className="mt-0.5 flex-row items-baseline gap-1.5">
                                            <Text
                                                className="text-ink-muted shrink font-mono text-xs"
                                                numberOfLines={1}
                                            >
                                                {money(from)}
                                            </Text>
                                            <Text className="text-ink-faint shrink-0 text-xs">&rarr;</Text>
                                            <Text
                                                className="text-brand shrink font-mono text-xs font-bold"
                                                numberOfLines={1}
                                            >
                                                {money(to)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {settlement.rejection_reason ? (
                                    <View className="mt-2 rounded-lg bg-accent-subtle px-3 py-2">
                                        <Text className="text-accent text-[11px] leading-4">
                                            {settlement.rejection_reason}
                                        </Text>
                                    </View>
                                ) : settlement.notes ? (
                                    <Text className="text-ink-muted mt-2 text-[11px]">
                                        {settlement.notes}
                                    </Text>
                                ) : null}

                                <Text className="text-ink-faint mt-2 text-[10px]" numberOfLines={1}>
                                    {settlement.recorded_by ?? 'Unknown'}
                                    {settlement.approved_at
                                        ? ` · approved ${settlement.approved_at}`
                                        : settlement.rejected_at
                                          ? ` · rejected ${settlement.rejected_at}`
                                          : settlement.recorded_at
                                            ? ` · ${settlement.recorded_at}`
                                            : ''}
                                </Text>

                                {isPending ? (
                                    <View className="mt-3 flex-row gap-2">
                                        <Pressable
                                            onPress={() => onApprove(settlement)}
                                            disabled={approving}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Approve ${money(settlement.amount)} to ${settlement.supplier_name}`}
                                            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 ${
                                                approving ? 'opacity-50' : 'active:opacity-80'
                                            }`}
                                        >
                                            <Check size={14} color="#ffffff" />
                                            <Text className="text-white text-[11px] font-bold">Approve</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => setRejecting(settlement)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Reject payment"
                                            className="flex-row items-center justify-center gap-1.5 rounded-full border border-accent/30 bg-accent-subtle px-4 py-2.5 active:opacity-80"
                                        >
                                            <X size={14} color="#bf0a30" />
                                            <Text className="text-accent text-[11px] font-bold">Reject</Text>
                                        </Pressable>
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            )}

            <RejectSupplierSheet settlement={rejecting} onClose={() => setRejecting(null)} />
        </View>
    );
}

function RejectSupplierSheet({
    settlement,
    onClose,
}: {
    settlement: SupplierSettlement | null;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const { mutateAsync: reject, isPending } = useRejectSupplierPayment();

    if (!settlement) return null;

    const submit = async () => {
        try {
            await reject({ id: settlement.id, reason: reason.trim() });
            toast.success('Payment rejected', { description: 'What is owed stays as it is.' });
            setReason('');
            onClose();
        } catch (error) {
            toast.error('Could not reject', { description: getApiErrorMessage(error) });
        }
    };

    return (
        <Sheet
            visible
            title="Reject this payment?"
            subtitle={`${money(settlement.amount)} to ${settlement.supplier_name}`}
            onClose={onClose}
            maxHeight="60%"
        >
            <View>
                <Text className="text-ink-faint mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                    Reason
                </Text>
                <TextInput
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    placeholder="What should be checked before paying?"
                    placeholderTextColor="#8b8b99"
                    accessibilityLabel="Reason for rejection"
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                    className="rounded-xl border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-ink"
                />
            </View>

            <Pressable
                onPress={submit}
                disabled={reason.trim().length < 3 || isPending}
                accessibilityRole="button"
                className={`flex-row items-center justify-center gap-2 rounded-full bg-accent py-3 ${
                    reason.trim().length < 3 || isPending ? 'opacity-50' : 'active:opacity-80'
                }`}
            >
                {isPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                <Text className="text-white text-xs font-bold">Reject payment</Text>
            </Pressable>
        </Sheet>
    );
}

/** Recording a payment to a supplier, from the creditors list. */
export function RecordSupplierPaymentSheet({
    supplierId,
    supplierName,
    outstanding,
    onClose,
}: {
    supplierId: string | null;
    supplierName?: string;
    outstanding: number;
    onClose: () => void;
}) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<SettlementMethod>('bank');
    const [reference, setReference] = useState('');

    const { mutateAsync: record, isPending } = useRecordSupplierPayment();

    if (!supplierId) return null;

    const parsed = Number(amount.replace(/,/g, ''));
    const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= outstanding;

    const submit = async () => {
        try {
            await record({
                supplier_id: supplierId,
                amount: parsed,
                method,
                reference: reference.trim() || undefined,
            });

            toast.success('Payment recorded', {
                description: 'It reduces the balance once an admin approves it.',
            });
            setAmount('');
            setReference('');
            onClose();
        } catch (error) {
            toast.error('Could not record the payment', { description: getApiErrorMessage(error) });
        }
    };

    return (
        <Sheet
            visible
            title="Pay supplier"
            subtitle={`${supplierName ?? 'Supplier'} · owed ${money(outstanding)}`}
            onClose={onClose}
        >
            <View className="rounded-xl bg-brand-subtle px-4 py-3">
                <Text className="text-brand text-[11px] leading-4">
                    This does not reduce what is owed yet. An admin confirms the payment went out
                    first.
                </Text>
            </View>

            <View>
                <Text className="text-ink-faint mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                    Amount
                </Text>
                <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#8b8b99"
                    accessibilityLabel="Amount paid"
                    className="rounded-xl border border-surface-border bg-surface-sunken px-4 py-3 font-mono text-lg text-ink"
                />
                {amount.length > 0 && !valid ? (
                    <Text className="text-accent mt-1 text-[11px]">
                        {parsed > outstanding
                            ? `More than the ${money(outstanding)} owed.`
                            : 'Enter an amount greater than zero.'}
                    </Text>
                ) : (
                    <Pressable onPress={() => setAmount(String(outstanding))} hitSlop={6}>
                        <Text className="text-brand mt-1 text-[11px] font-semibold">
                            Pay the full {money(outstanding)}
                        </Text>
                    </Pressable>
                )}
            </View>

            <View>
                <Text className="text-ink-faint mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                    Method
                </Text>
                <View className="flex-row flex-wrap gap-2">
                    {SETTLEMENT_METHODS.map((option) => {
                        const selected = option.id === method;
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() => setMethod(option.id)}
                                accessibilityRole="button"
                                className={`rounded-full border px-3.5 py-2 ${
                                    selected
                                        ? 'border-brand bg-brand'
                                        : 'border-surface-border bg-surface active:bg-surface-sunken'
                                }`}
                            >
                                <Text
                                    className={`text-[11px] font-semibold ${
                                        selected ? 'text-white' : 'text-ink-muted'
                                    }`}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View>
                <Text className="text-ink-faint mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                    Reference (optional)
                </Text>
                <TextInput
                    value={reference}
                    onChangeText={setReference}
                    autoCapitalize="characters"
                    placeholder="Transfer or cheque number"
                    placeholderTextColor="#8b8b99"
                    accessibilityLabel="Payment reference"
                    className="rounded-xl border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-ink"
                />
            </View>

            <Pressable
                onPress={submit}
                disabled={!valid || isPending}
                accessibilityRole="button"
                className={`flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3.5 ${
                    !valid || isPending ? 'opacity-50' : 'active:opacity-80'
                }`}
            >
                {isPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                <Text className="text-white text-sm font-bold">
                    {isPending ? 'Recording' : 'Submit for approval'}
                </Text>
            </Pressable>
        </Sheet>
    );
}
