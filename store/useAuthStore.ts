import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { queryClient } from '@/lib/queryClient';

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
        await SecureStore.setItemAsync('auth_token', token);
        // Don't route here - let useProtectedRoute handle role-based routing
        set({ token, isLoading: false });
    },
    logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');

        // Clear all React Query cache to prevent stale role data
        queryClient.clear();

        set({ token: null });
        router.replace('/(auth)/login');
    },
    checkSession: async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');

            if (token) {
                // Don't route here - let useProtectedRoute handle role-based routing
                set({ token, isLoading: false });
            } else {
                set({ token: null, isLoading: false });
            }
        } catch (error) {
            set({ isLoading: false });
        }
    },
}));