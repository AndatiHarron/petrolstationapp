import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { useApprovalSummary } from '@/features/approvals';
import { Sheet } from '@/components/sheet';

/**
 * In-app notice of what is waiting to be approved.
 *
 * A badge in the top bar rather than a push notification: everything here is
 * acted on inside the app anyway, and it needs no notification permission,
 * no device token and no server push infrastructure.
 *
 * Renders nothing at all for a role that cannot approve, so a manager never
 * sees a bell that would only ever be empty.
 */
export function ApprovalsBell() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { total, canApprove, allQueues } = useApprovalSummary();

    if (!canApprove) return null;

    const go = (href: string) => {
        setOpen(false);
        router.push(href as never);
    };

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={
                    total > 0 ? `${total} items awaiting approval` : 'Nothing awaiting approval'
                }
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
            >
                <Bell size={20} color={total > 0 ? '#040273' : '#8b8b99'} />

                {total > 0 ? (
                    <View
                        className="absolute items-center justify-center rounded-full bg-accent px-1"
                        style={{ top: 2, right: 0, minWidth: 16, height: 16 }}
                    >
                        <Text className="text-white text-[9px] font-bold">
                            {total > 99 ? '99+' : total}
                        </Text>
                    </View>
                ) : null}
            </Pressable>

            <Sheet
                visible={open}
                title="Awaiting approval"
                subtitle={
                    total > 0
                        ? `${total} item${total === 1 ? '' : 's'} need your decision`
                        : 'Nothing needs your decision'
                }
                onClose={() => setOpen(false)}
                maxHeight="70%"
            >
                {total === 0 ? (
                    <View className="items-center rounded-xl bg-surface-sunken py-10">
                        <Text className="text-ink-muted text-sm">You are all caught up</Text>
                    </View>
                ) : (
                    <View className="rounded-xl border border-surface-border">
                        {allQueues.map((queue, index) => {
                            const waiting = queue.count > 0;

                            return (
                                <Pressable
                                    key={queue.key}
                                    onPress={() => go(queue.href)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${queue.count} ${queue.label}`}
                                    className={`flex-row items-center justify-between gap-3 px-4 py-3.5 ${
                                        index < allQueues.length - 1 ? 'border-b border-surface-border' : ''
                                    } active:bg-surface-sunken`}
                                >
                                    <Text
                                        className={`min-w-0 flex-1 text-sm ${
                                            waiting ? 'text-ink font-semibold' : 'text-ink-faint'
                                        }`}
                                        numberOfLines={1}
                                    >
                                        {queue.label}
                                    </Text>

                                    <View className="shrink-0 flex-row items-center gap-2">
                                        <View
                                            className={`min-w-[22px] items-center rounded-full px-2 py-0.5 ${
                                                waiting ? 'bg-accent' : 'bg-surface-sunken'
                                            }`}
                                        >
                                            <Text
                                                className={`text-[10px] font-bold ${
                                                    waiting ? 'text-white' : 'text-ink-faint'
                                                }`}
                                            >
                                                {queue.count}
                                            </Text>
                                        </View>
                                        <ChevronRight size={14} color="#8b8b99" />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </Sheet>
        </>
    );
}
