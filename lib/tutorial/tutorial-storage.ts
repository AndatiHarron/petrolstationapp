import * as SecureStore from 'expo-secure-store';
import type { TutorialRole } from './types';

function keyForRole(role: TutorialRole): string {
    switch (role) {
        case 'admin':
            return 'tutorial_completed_admin';
        case 'manager':
            return 'tutorial_completed_manager';
    }
}

export async function getTutorialCompleted(role: TutorialRole): Promise<boolean> {
    try {
        const value = await SecureStore.getItemAsync(keyForRole(role));
        return value === '1';
    } catch {
        return false;
    }
}

export async function setTutorialCompleted(role: TutorialRole, completed: boolean): Promise<void> {
    try {
        await SecureStore.setItemAsync(keyForRole(role), completed ? '1' : '0');
    } catch {
        // best-effort persistence
    }
}

export async function clearTutorialCompleted(role: TutorialRole): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(keyForRole(role));
    } catch {
        // best-effort persistence
    }
}

