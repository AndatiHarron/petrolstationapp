import { useAuthStore } from '@/store/useAuthStore';
import { useGetV1User } from '@/features/api/default/default';
import { useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute() {
    const { token, isLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

    const { data: userData, isLoading: isUserLoading } = useGetV1User({
        query: {
            enabled: !!token,
            // Reduce refetch churn; roles don't change often during a session.
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnMount: false,
            refetchOnReconnect: true,
            retry: 1,
        }
    });

    useEffect(() => {
        const navigationReady = rootNavigationState?.key && rootNavigationState?.routeNames?.length;

        if (isLoading || !navigationReady || (token && isUserLoading)) {
            return;
        }

        const inAuthGroup = segments[0] === '(auth)';

        try {
            // Signing out is handled declaratively by <Stack.Protected> in the root
            // layout, which unmounts the authenticated routes when the token clears.
            // This hook only decides *which* authenticated area a signed-in user
            // belongs to; it must not redirect on a missing token or it races the
            // unmount and strands the user on a dead screen.
            if (token) {
                // User is signed in
                // API returns { data: UserResource } directly
                const userResponse = userData as unknown as { data?: { roles?: string[] } };
                if (userResponse?.data?.roles) {
                    const roles = userResponse.data.roles;

                    if (roles.includes('manager')) {
                        if (segments[0] !== 'station-manager') {
                            console.log('DEBUG: Redirecting to station-manager');
                            router.replace('/station-manager');
                        }
                    } else if (roles.includes('super-admin')) {
                        if (segments[0] !== 'super-admin') {
                            console.log('DEBUG: Redirecting to super-admin');
                            router.replace('/super-admin');
                        }
                    } else if (roles.includes('admin')) {
                        if (segments[0] !== 'admin') {
                            console.log('DEBUG: Redirecting to admin');
                            router.replace('/admin');
                        }
                    } else {
                        // Default user (e.g. just '/(main)')
                        if (inAuthGroup) {
                            router.replace('/(main)');
                        }
                    }
                }
            }
        } catch (e) {
            // Silently ignore navigation errors during transient states (e.g. Modal transitions)
            console.warn('Navigation guard: deferred navigation attempt', e);
        }
    }, [token, segments, isLoading, rootNavigationState, userData, isUserLoading]);
}

