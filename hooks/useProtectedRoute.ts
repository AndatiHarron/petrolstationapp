import { useAuthStore } from '@/store/useAuthStore';
import { useGetV1User } from '@/features/api/default/default';
import { useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute() {
    const { user, isLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

    const { data: userData, isLoading: isUserLoading, error: userError } = useGetV1User({
        query: {
            enabled: !!user,
        }
    });

    useEffect(() => {
        const navigationStateKey = rootNavigationState?.key;

        if (isLoading || !navigationStateKey || (user && isUserLoading)) {
            return;
        }

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            // Not signed in and not in auth group -> Redirect to login
            router.replace('/(auth)/login');
        } else if (user) {
            // User is signed in
            if (userData) {
                // @ts-ignore
                const userRoles = userData.data?.roles || userData.roles;
                const roles = (userRoles as string[]) || [];

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
    }, [user, segments, isLoading, rootNavigationState, userData, isUserLoading]);
}
