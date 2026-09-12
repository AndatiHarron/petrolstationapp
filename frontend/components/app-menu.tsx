import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
    Building2,
    ClipboardList,
    FileText,
    LayoutDashboard,
    Banknote,
    Menu,
    Package,
    Settings,
    Users,
    X,
} from 'lucide-react-native';
import { useRoles, type AppRole } from '@/hooks/useRoles';

interface Destination {
    href: string;
    label: string;
    hint: string;
    Icon: typeof LayoutDashboard;
    /** Roles allowed to see it. Omit for everyone signed in. */
    roles?: AppRole[];
}

/**
 * Secondary destinations, kept out of the bottom bar.
 *
 * The bottom tabs hold the three screens someone opens many times a day; these
 * are the ones opened occasionally, and seven tabs across a phone left every
 * label wrapped. Role gating is by the server's roles, so the menu never offers
 * a screen the API would refuse.
 */
const DESTINATIONS: Destination[] = [
    {
        href: '/admin',
        label: 'Dashboard',
        hint: 'Stock, prices and recent activity',
        Icon: LayoutDashboard,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/admin/finance',
        label: 'Finance',
        hint: 'Shifts, credit sales and creditors',
        Icon: Banknote,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/admin/reports',
        label: 'Reports',
        hint: 'End of day, monthly, credit, VAT',
        Icon: FileText,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/admin/inventory',
        label: 'Stock',
        hint: 'Fuel deliveries and tank levels',
        Icon: Package,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/admin/requests',
        label: 'Edit requests',
        hint: 'Approve corrections to locked shifts',
        Icon: ClipboardList,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/admin/infrastructure',
        label: 'Setup',
        hint: 'Stations, tanks, pumps and products',
        Icon: Building2,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/admin/system',
        label: 'System',
        hint: 'Users, roles and the activity log',
        Icon: Settings,
        roles: ['admin', 'super-admin'],
    },
    {
        href: '/super-admin',
        label: 'Organizations',
        hint: 'Tenants and their administrators',
        Icon: Users,
        roles: ['super-admin'],
    },
    {
        href: '/station-manager',
        label: 'My shift',
        hint: 'Open, run and close a shift',
        Icon: LayoutDashboard,
        roles: ['manager'],
    },
    {
        href: '/station-manager/shifts',
        label: 'Shift history',
        hint: 'Past shifts and their variance',
        Icon: FileText,
        roles: ['manager'],
    },
    {
        href: '/station-manager/liftings',
        label: 'Deliveries',
        hint: 'Record fuel received',
        Icon: Package,
        roles: ['manager'],
    },
    {
        href: '/station-manager/customers',
        label: 'Customers',
        hint: 'Credit account holders',
        Icon: Users,
        roles: ['manager'],
    },
];

/** The hamburger, for a screen header. */
export function AppMenuButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-sunken"
            >
                <Menu size={22} color="#040273" />
            </Pressable>

            <AppMenuSheet visible={open} onClose={() => setOpen(false)} />
        </>
    );
}

function AppMenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const { roles, name, email } = useRoles();

    if (!visible) return null;

    const available = DESTINATIONS.filter(
        (destination) => !destination.roles || destination.roles.some((role) => roles.includes(role))
    );

    const go = (href: string) => {
        onClose();
        if (href !== pathname) {
            router.push(href as never);
        }
    };

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View
                    className="rounded-t-3xl border-t border-surface-border bg-surface"
                    style={{ maxHeight: '85%' }}
                >
                    <View className="flex-row items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-base font-bold" numberOfLines={1}>
                                {name ?? 'Menu'}
                            </Text>
                            <Text className="text-ink-muted text-xs" numberOfLines={1}>
                                {email ?? 'Signed in'}
                                {roles.length > 0 ? ` · ${roles.join(', ')}` : ''}
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close menu"
                            hitSlop={8}
                            className="shrink-0 rounded-full bg-surface-sunken p-2"
                        >
                            <X size={16} color="#5c5c6b" />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                        {available.length === 0 ? (
                            <View className="items-center px-5 py-10">
                                <Text className="text-ink-muted text-sm">Nothing available yet</Text>
                            </View>
                        ) : (
                            available.map((destination) => {
                                const active = pathname === destination.href;
                                const { Icon } = destination;

                                return (
                                    <Pressable
                                        key={destination.href}
                                        onPress={() => go(destination.href)}
                                        accessibilityRole="button"
                                        className={`flex-row items-center gap-3 border-b border-surface-border px-5 py-3.5 ${
                                            active ? 'bg-brand-subtle' : 'active:bg-surface-sunken'
                                        }`}
                                    >
                                        <View
                                            className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                active ? 'bg-brand' : 'bg-surface-sunken'
                                            }`}
                                        >
                                            <Icon size={17} color={active ? '#ffffff' : '#040273'} />
                                        </View>
                                        <View className="min-w-0 flex-1">
                                            <Text
                                                className={`text-sm ${active ? 'text-brand font-bold' : 'text-ink font-semibold'}`}
                                            >
                                                {destination.label}
                                            </Text>
                                            <Text className="text-ink-faint text-[11px]" numberOfLines={1}>
                                                {destination.hint}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
