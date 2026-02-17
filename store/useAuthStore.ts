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
        // Clear in-memory token immediately
        setApiAuthToken(null);
        set({ token: null });

        // Clear all React Query cache to prevent stale role data
        queryClient.clear();

        // Best-effort persistence cleanup
        SecureStore.deleteItemAsync('auth_token').catch(() => {
            // ignore
        });
        router.replace('/(auth)/login');
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