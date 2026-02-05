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
        }
    });

    useEffect(() => {
        const navigationStateKey = rootNavigationState?.key;

        if (isLoading || !navigationStateKey || (token && isUserLoading)) {
            return;
        }

        const inAuthGroup = segments[0] === '(auth)';

        if (!token && !inAuthGroup) {
            // Not signed in and not in auth group -> Redirect to login
            router.replace('/(auth)/login');
        } else if (token) {
            // User is signed in
            // API returns { data: UserResource } directly
            const userResponse = userData as unknown as { data?: { roles?: string[] } };
            if (userResponse?.data?.roles) {
                const roles = userResponse.data.roles;

                if (roles.includes('manager')) {
                    if (segments[0] !== '(station-manager)') {
                        console.log('DEBUG: Redirecting to station-manager');
                        router.replace('/(station-manager)');
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
    }, [token, segments, isLoading, rootNavigationState, userData, isUserLoading]);
}

