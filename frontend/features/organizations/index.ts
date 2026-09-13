import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@/lib/axios';
import { getOrganizationsIndexQueryKey } from '@/features/api/organization/organization';
import type { OrganizationResource } from '@/features/api/model';

/**
 * Renaming, retiring and deleting a tenant.
 *
 * The generated client covers only index, store and show — the OpenAPI
 * document it was built from predates these two routes. Rather than
 * regenerate the whole client for two calls, they are written out here the
 * same way the settlement and report calls are.
 */

export interface UpdateOrganizationInput {
    id: string;
    name?: string;
    slug?: string;
    /** `inactive` is how a tenant is taken out of service reversibly. */
    status?: 'active' | 'inactive';
}

export function useUpdateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }: UpdateOrganizationInput) =>
            customInstance<{ data: OrganizationResource }>(`/v1/organizations/${id}`, {
                method: 'PATCH',
                data,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getOrganizationsIndexQueryKey() });
        },
    });
}

export function useDeleteOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            customInstance<void>(`/v1/organizations/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getOrganizationsIndexQueryKey() });
        },
    });
}
