/**
 * Custom user store mutation - backend expects:
 * name, email, password (min 8), role (admin|manager), station_id?, organization_id? (required for super-admin)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '../../../lib/axios';
import type { UsersStore200 } from '../model';
import { getUsersIndexQueryKey } from './user';

export interface StoreUserRequest {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'manager';
    station_id?: string | null;
    organization_id?: string | null;
}

async function storeUser(data: StoreUserRequest): Promise<{ data: UsersStore200 }> {
    return customInstance(getUsersStoreUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
    });
}

function getUsersStoreUrl(): string {
    return '/v1/users';
}

export function useStoreUser(options?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: storeUser,
        mutationKey: ['usersStore'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getUsersIndexQueryKey() });
            options?.onSuccess?.();
        },
        onError: options?.onError,
    });
}
