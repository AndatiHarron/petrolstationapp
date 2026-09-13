import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Power } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { LogoutModal } from '@/components/station-manager/logout-modal';

interface LogoutButtonProps {
    /** Icon-only, for tight spots like a navigation header. */
    compact?: boolean;
}

/**
 * The single log-out control for the whole app.
 *
 * Every screen shares this so sign-out behaves identically everywhere. Dropping
 * the token is the entire operation — the root layout gates the authenticated
 * routes on it via <Stack.Protected>, so they unmount and the router returns to
 * the auth group by itself. Nothing here navigates imperatively.
 */
export function LogoutButton({ compact = false }: LogoutButtonProps) {
    const logout = useAuthStore((state) => state.logout);
    const [visible, setVisible] = useState(false);

    return (
        <>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                hitSlop={8}
                className={
                    compact
                        ? 'h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface active:bg-surface-sunken'
                        : 'flex-row shrink-0 items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1.5 active:bg-surface-sunken'
                }
            >
                <Power size={compact ? 18 : 14} color="#bf0a30" />
                {!compact && (
                    <Text className="text-ink text-[10px] font-bold uppercase tracking-wider">
                        Log Out
                    </Text>
                )}
            </TouchableOpacity>

            <LogoutModal
                visible={visible}
                onClose={() => setVisible(false)}
                onConfirm={() => {
                    setVisible(false);
                    logout();
                }}
            />
        </>
    );
}
