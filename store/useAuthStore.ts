import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { queryClient } from '@/lib/queryClient';
import { setApiAuthToken } from '@/lib/axios';

interface AuthState {
    token: string | null;
    isLoading: boolean;

    // Actions
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    isLoading: true,

    login: async (token) => {
        // Set in-memory token immediately (avoid SecureStore delay for first API calls)
        setApiAuthToken(token);
        set({ token, isLoading: false });

        // Persist in the background
        SecureStore.setItemAsync('auth_token', token).catch(() => {
            // ignore persistence errors; session will just not survive restart
        });
    },
    logout: async () => {
        console.log('LOGOUT: invoked');

        // Clear in-memory token first so no in-flight request re-authenticates.
        setApiAuthToken(null);

        // Sign out synchronously, THEN clean up storage. Awaiting SecureStore before
        // this line meant a slow or hanging native call blocked the entire sign-out
        // and the tap appeared to do nothing. Dropping the token is the sign-out:
        // the root layout gates the authenticated routes on it via <Stack.Protected>,
        // so they unmount and the router returns to the auth group by itself.
        queryClient.clear();
        set({ token: null, isLoading: false });
        console.log('LOGOUT: token cleared');

        // Best-effort persistence cleanup; never block the UI on it.
        SecureStore.deleteItemAsync('auth_token').catch(() => {
            // ignore persistence errors
        });
    },
    checkSession: async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');

            if (token) {
                setApiAuthToken(token);
                set({ token, isLoading: false });
            } else {
                setApiAuthToken(null);
                set({ token: null, isLoading: false });
            }
        } catch (error) {
            setApiAuthToken(null);
            set({ isLoading: false });
        }
    },
}));