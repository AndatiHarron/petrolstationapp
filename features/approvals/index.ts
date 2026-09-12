import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * What is waiting for the signed-in user to approve.
 *
 * One request rather than one per queue, because this drives a badge shown on
 * every screen. It refetches on a slow interval and whenever a screen remounts,
 * which is enough for an approval queue — this is a working notice, not a
 * real-time feed, and polling harder would cost battery for nothing.
 */

export interface ApprovalQueue {
    key: 'edit_requests' | 'credit_payments' | 'supplier_payments';
    label: string;
    count: number;
    href: string;
}

export interface ApprovalSummary {
    data: {
        total: number;
        can_approve: boolean;
        queues: ApprovalQueue[];
    };
}

export const APPROVALS_KEY = ['approvals', 'summary'] as const;

export function useApprovalSummary() {
    const token = useAuthStore((state) => state.token);

    const query = useQuery({
        queryKey: APPROVALS_KEY,
        enabled: !!token,
        queryFn: () => customInstance<ApprovalSummary>('/v1/approvals/summary', { method: 'GET' }),
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
    });

    const summary = query.data?.data;

    return {
        ...query,
        total: summary?.total ?? 0,
        canApprove: summary?.can_approve ?? false,
        queues: (summary?.queues ?? []).filter((queue) => queue.count > 0),
        allQueues: summary?.queues ?? [],
    };
}
