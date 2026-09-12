import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMenuButton } from '@/components/app-menu';
import { LogoutButton } from '@/components/logout-button';

interface TopBarProps {
    title: string;
    /** Optional right-hand slot, e.g. a shift status pill. */
    trailing?: React.ReactNode;
}

/**
 * The one top bar, rendered by each role's layout so the menu is reachable from
 * every screen rather than only the ones that happen to draw their own header.
 *
 * It owns the safe-area inset itself because it sits above the navigator's
 * screens, which have their own SafeAreaView.
 */
export function TopBar({ title, trailing }: TopBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            className="border-b border-surface-border bg-surface"
            style={{ paddingTop: insets.top }}
        >
            <View className="h-14 flex-row items-center gap-2 px-2">
                <AppMenuButton />

                <Text className="text-ink flex-1 text-base font-bold" numberOfLines={1}>
                    {title}
                </Text>

                {trailing}
                <LogoutButton compact />
            </View>
        </View>
    );
}
