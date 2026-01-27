import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

interface User {
    id: number;
    name: string;
    email: string;
    station_id?: number;
  }
  
  interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    
    // Actions
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
  }

  export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isLoading: false,

    login: async (token, user) => {
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(user));

        set({ token, user });
        router.replace('/(app)/dashboard');
    },
    logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('auth_user');

        set({ token: null, user: null });
        router.replace('/(auth)/login');
    },
    checkSession: async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const userStr = await SecureStore.getItemAsync('auth_user');

            if (token && userStr) {
                set({ token, user: JSON.parse(userStr), isLoading: false });
                router.replace('/(app)/dashboard');
            } else {
                set({ token: null, user: null, isLoading: false });
            }
        } catch (error) {
            set({ isLoading: false });
        }
    },
  }));