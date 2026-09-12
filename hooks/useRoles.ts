import { useGetV1User } from '@/features/api/default/default';
import { useAuthStore } from '@/store/useAuthStore';

export type AppRole = 'admin' | 'manager' | 'super-admin';

/**
 * The signed-in user's roles.
 *
 * Shares the cache key with useProtectedRoute's lookup, so adding this to a
 * screen costs no extra request. Roles come from the server rather than being
 * inferred from the current route, so a menu built from them cannot offer a
 * destination the API would refuse.
 */
export function useRoles() {
    const token = useAuthStore((state) => state.token);

    const { data, isLoading } = useGetV1User({
        query: {
            enabled: !!token,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        },
    });

    const response = data as unknown as
        | { data?: { roles?: string[]; name?: string; email?: string } }
        | undefined;

    const roles = (response?.data?.roles ?? []) as AppRole[];

    return {
        roles,
        name: response?.data?.name,
        email: response?.data?.email,
        isLoading,
        has: (role: AppRole) => roles.includes(role),
        hasAny: (...wanted: AppRole[]) => wanted.some((role) => roles.includes(role)),
    };
}
