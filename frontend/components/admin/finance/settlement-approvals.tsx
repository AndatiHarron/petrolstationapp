import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { toast } from 'sonner-native';
import {
    useApproveSettlement,
    useRejectSettlement,
    useSettlements,
    type Settlement,
    type SettlementStatus,
} from '@/features/settlements';
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
    APPROVED: { pill: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
    REJECTED: { pill: 'bg-accent-subtle', text: 'text-accent', label: 'Rejected' },
};

export type SettlementFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface SettlementApprovalsProps {
    /** Follows the screen's filter chips, so an approved payment stays visible. */
    filter?: SettlementFilter;
}

/**
 * Admin review of the payments managers have recorded against credit customers.
 *
 * Approving is what actually reduces the customer's balance, so pending rows
 * state the effect before the button is pressed, and settled rows keep showing
 * what the balance moved from and to.
 */
export function SettlementApprovals({ filter = 'all' }: SettlementApprovalsProps) {
    const { data, isLoading, isError, refetch } = useSettlements(
        filter === 'all' ? undefined : filter
    );
    const { mutateAsync: approve, isPending: approving } = useApproveSettlement();
    const [rejecting, setRejecting] = useState<Settlement | null>(null);

    const settlements = data?.data ?? [];
    const pendingCount = settlements.filter((settlement) => settlement.status === 'PENDING').length;

    const onApprove = async (settlement: Settlement) => {
        try {
            await approve(settlement.id);
            toast.success('Payment approved', {
                description: `${settlement.customer_name} now owes ${money(
                    Math.max(settlement.customer_balance - settlement.amount, 0)
                )}.`,
            });
        } catch (error) {
            toast.error('Could not approve', { description: getApiErrorMessage(error) });
        }
    };

    return (
        <View className="mb-6">
            <View className="mb-1 flex-row items-center gap-2">
                <Text className="text-ink text-xl font-bold">Credit payments</Text>
                {pendingCount > 0 ? (
                    <View className="rounded-full bg-amber-50 px-2 py-0.5">
                        <Text className="text-amber-700 text-xs font-bold">{pendingCount}</Text>
                    </View>
                ) : null}
            </View>
            <Text className="text-ink-muted mb-3 text-xs">
                Recorded by station managers. Approving reduces the customer&rsquo;s balance.
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
                    <Text className="text-ink-muted text-sm">
                        {filter === 'all' ? 'No credit payments yet' : `No ${filter} payments`}
                    </Text>
                </View>
            ) : (
                <View className="gap-2">
                    {settlements.map((settlement) => {
                        const status = STATUS_STYLES[settlement.status];
                        const isPending = settlement.status === 'PENDING';

                        // Pending rows project the effect; settled rows record it.
                        const from = isPending
                            ? settlement.customer_balance
                            : (settlement.balance_before ?? settlement.customer_balance);
                        const to = isPending
                            ? Math.max(settlement.customer_balance - settlement.amount, 0)
                            : (settlement.balance_after ?? from);

                        return (
                            <View
                                key={settlement.id}
                                className="rounded-xl border border-surface-border bg-surface p-4"
                            >
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="min-w-0 flex-1">
                                        <Text className="text-ink text-sm font-bold" numberOfLines={1}>
                                            {settlement.customer_name ?? 'Customer'}
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

                                <View className="mt-3 rounded-lg bg-surface-sunken px-3 py-2">
                                    <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-wider">
                                        {isPending
                                            ? 'Balance after'
                                            : settlement.status === 'APPROVED'
                                              ? 'Balance moved'
                                              : 'Balance unchanged'}
                                    </Text>

                                    {settlement.status === 'REJECTED' ? (
                                        <Text className="text-ink-muted mt-0.5 font-mono text-xs font-bold">
                                            {money(settlement.customer_balance)}
                                        </Text>
                                    ) : (
                                        <View className="mt-0.5 flex-row items-baseline gap-1.5">
                                            <Text className="text-ink-muted shrink font-mono text-xs" numberOfLines={1}>
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
                                    {settlement.station_name ? ` · ${settlement.station_name}` : ''}
                                    {settlement.approved_at
                                        ? ` · approved ${settlement.approved_at}`
                                        : settlement.rejected_at
                                          ? ` · rejected ${settlement.rejected_at}`
                                          : settlement.recorded_at
                                            ? ` · ${settlement.recorded_at}`
                                            : ''}
                                </Text>

                                {/* Only a pending payment can still be decided. */}
                                {isPending ? (
                                    <View className="mt-3 flex-row gap-2">
                                        <Pressable
                                            onPress={() => onApprove(settlement)}
                                            disabled={approving}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Approve ${money(settlement.amount)} from ${settlement.customer_name}`}
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

            <RejectSheet settlement={rejecting} onClose={() => setRejecting(null)} />
        </View>
    );
}

function RejectSheet({
    settlement,
    onClose,
}: {
    settlement: Settlement | null;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const { mutateAsync: reject, isPending } = useRejectSettlement();

    if (!settlement) return null;

    const submit = async () => {
        try {
            await reject({ id: settlement.id, reason: reason.trim() });
            toast.success('Payment rejected', { description: 'The balance is unchanged.' });
            setReason('');
            onClose();
        } catch (error) {
            toast.error('Could not reject', { description: getApiErrorMessage(error) });
        }
    };

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View className="rounded-t-3xl border-t border-surface-border bg-surface px-5 pb-8 pt-5">
                    <Text className="text-ink text-base font-bold">Reject this payment?</Text>
                    <Text className="text-ink-muted mt-1 text-xs">
                        {money(settlement.amount)} from {settlement.customer_name}. The balance stays
                        as it is.
                    </Text>

                    <Text className="text-ink-faint mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wider">
                        Reason
                    </Text>
                    <TextInput
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        placeholder="What should the manager fix or check?"
                        placeholderTextColor="#8b8b99"
                        accessibilityLabel="Reason for rejection"
                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                        className="rounded-xl border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-ink"
                    />

                    <View className="mt-4 flex-row gap-2">
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            className="rounded-full border border-surface-border bg-surface px-5 py-3 active:bg-surface-sunken"
                        >
                            <Text className="text-ink-muted text-xs font-semibold">Cancel</Text>
                        </Pressable>

                        <Pressable
                            onPress={submit}
                            disabled={reason.trim().length < 3 || isPending}
                            accessibilityRole="button"
                            className={`flex-1 flex-row items-center justify-center gap-2 rounded-full bg-accent py-3 ${
                                reason.trim().length < 3 || isPending ? 'opacity-50' : 'active:opacity-80'
                            }`}
                        >
                            {isPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                            <Text className="text-white text-xs font-bold">Reject payment</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
