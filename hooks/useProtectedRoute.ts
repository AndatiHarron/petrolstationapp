import { useAuthStore } from '@/store/useAuthStore';
import { useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute() {
    const { user, isLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

    useEffect(() => {
        const navigationStateKey = rootNavigationState?.key;
        if (isLoading || !navigationStateKey) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (
            // If the user is not signed in and the initial segment is not anything in the auth group.
            !user &&
            !inAuthGroup
        ) {
            // Redirect to the sign-in page.
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            // Redirect away from the sign-in page.
            router.replace('/(main)');
        }
    }, [user, segments, isLoading, rootNavigationState]);
}
