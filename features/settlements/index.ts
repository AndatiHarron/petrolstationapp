import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@/lib/axios';
import { getCustomersIndexQueryKey } from '@/features/api/customer/customer';

/**
 * Clearing a customer's credit balance: a manager records the payment, an admin
 * approves it, and only then does the balance move.
 *
 * Hand-written rather than generated because this endpoint postdates the last
 * Orval run; regenerating the client will supersede it.
 */

export type SettlementStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SettlementMethod = 'cash' | 'mpesa' | 'bank' | 'cheque';

export const SETTLEMENT_METHODS: { id: SettlementMethod; label: string }[] = [
    { id: 'cash', label: 'Cash' },
    { id: 'mpesa', label: 'M-Pesa' },
    { id: 'bank', label: 'Bank' },
    { id: 'cheque', label: 'Cheque' },
];

export interface Settlement {
    id: string;
    customer_id: string;
    customer_name: string | null;
    customer_balance: number;
    station_name: string | null;
    amount: number;
    method: SettlementMethod;
    reference: string | null;
    notes: string | null;
    status: SettlementStatus;
    recorded_by: string | null;
    approved_by: string | null;
    balance_before: number | null;
    balance_after: number | null;
    rejection_reason: string | null;
    recorded_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
}

interface SettlementList {
    data: Settlement[];
    meta?: { current_page: number; last_page: number; total: number };
}

const KEY = ['credit-settlements'] as const;

export function useSettlements(status?: Lowercase<SettlementStatus>) {
    return useQuery({
        queryKey: [...KEY, status ?? 'all'],
        queryFn: () =>
            customInstance<SettlementList>(
                `/v1/credit-settlements${status ? `?status=${status}` : ''}`,
                { method: 'GET' }
            ),
    });
}

export interface RecordSettlementInput {
    customer_id: string;
    amount: number;
    method: SettlementMethod;
    reference?: string;
    notes?: string;
}

export function useRecordSettlement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: RecordSettlementInput) =>
            customInstance<{ data: Settlement }>('/v1/credit-settlements', {
                method: 'POST',
                data: input,
            } as never),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY });
        },
    });
}

export function useApproveSettlement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            customInstance<{ data: Settlement }>(`/v1/credit-settlements/${id}/approve`, {
                method: 'POST',
            }),
        onSuccess: () => {
            // Approval is the point at which the balance moves, so the customer
            // lists and any debt report are stale from here.
            queryClient.invalidateQueries({ queryKey: KEY });
            queryClient.invalidateQueries({ queryKey: getCustomersIndexQueryKey() });
            queryClient.invalidateQueries({ queryKey: ['report'] });
        },
    });
}

export function useRejectSettlement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            customInstance<{ data: Settlement }>(`/v1/credit-settlements/${id}/reject`, {
                method: 'POST',
                data: { reason },
            } as never),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY });
        },
    });
}
