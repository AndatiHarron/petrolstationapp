import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { toast } from 'sonner-native';
import {
    SETTLEMENT_METHODS,
    useRecordSettlement,
    type SettlementMethod,
} from '@/features/settlements';
import { getApiErrorMessage } from '@/lib/api-error';

interface RecordPaymentModalProps {
    visible: boolean;
    customerId: string | null;
    customerName?: string;
    outstanding: number;
    onClose: () => void;
}

function money(value: number): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * A manager recording that a credit customer has paid.
 *
 * It is explicit that this does not clear the balance yet: the manager takes the
 * money, an admin confirms it arrived, and only then does the balance move. Say
 * so on the form rather than letting them believe the debt is settled.
 */
export function RecordPaymentModal({
    visible,
    customerId,
    customerName,
    outstanding,
    onClose,
}: RecordPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<SettlementMethod>('cash');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    const { mutateAsync: record, isPending } = useRecordSettlement();

    if (!visible || !customerId) return null;

    const parsed = Number(amount.replace(/,/g, ''));
    const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= outstanding;

    const reset = () => {
        setAmount('');
        setMethod('cash');
        setReference('');
        setNotes('');
    };

    const submit = async () => {
        try {
            await record({
                customer_id: customerId,
                amount: parsed,
                method,
                reference: reference.trim() || undefined,
                notes: notes.trim() || undefined,
            });

            toast.success('Payment recorded', {
                description: 'It will clear the balance once an admin approves it.',
            });
            reset();
            onClose();
        } catch (error) {
            toast.error('Could not record the payment', { description: getApiErrorMessage(error) });
        }
    };

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View className="rounded-t-3xl border-t border-surface-border bg-surface" style={{ maxHeight: '90%' }}>
                    <View className="flex-row items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-base font-bold" numberOfLines={1}>
                                Record payment
                            </Text>
                            <Text className="text-ink-muted text-xs" numberOfLines={1}>
                                {customerName ?? 'Customer'} · owes {money(outstanding)}
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

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}>
                        <View className="rounded-xl bg-brand-subtle px-4 py-3">
                            <Text className="text-brand text-[11px] leading-4">
                                This does not clear the balance yet. An admin reviews it first, and
                                the customer&rsquo;s balance changes only once they approve.
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
                                Reference {method === 'mpesa' ? '(M-Pesa code)' : '(optional)'}
                            </Text>
                            <TextInput
                                value={reference}
                                onChangeText={setReference}
                                autoCapitalize="characters"
                                placeholder={method === 'mpesa' ? 'QGR7HT21X' : 'Slip or cheque number'}
                                placeholderTextColor="#8b8b99"
                                accessibilityLabel="Payment reference"
                                className="rounded-xl border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-ink"
                            />
                        </View>

                        <View>
                            <Text className="text-ink-faint mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                                Notes (optional)
                            </Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                placeholder="Anything the admin should know"
                                placeholderTextColor="#8b8b99"
                                accessibilityLabel="Notes"
                                style={{ minHeight: 76, textAlignVertical: 'top' }}
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
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
