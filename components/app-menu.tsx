import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    Animated,
    Dimensions,
    Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
    Banknote,
    Building2,
    ClipboardList,
    FileText,
    LayoutDashboard,
    Menu,
    Package,
    Settings,
    Users,
    X,
} from 'lucide-react-native';
import { useRoles, type AppRole } from '@/hooks/useRoles';
import { Avatar } from '@/components/avatar';

const PANEL_WIDTH = Math.min(Math.round(Dimensions.get('window').width * 0.84), 336);
const OPEN_MS = 240;
const CLOSE_MS = 180;

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
 * The bottom tabs hold the three screens opened many times a day; these are the
 * occasional ones, and seven tabs across a phone left every label wrapped. Role
 * gating uses the server's roles, so the menu never offers a screen the API
 * would refuse.
 */
const DESTINATIONS: Destination[] = [
    { href: '/admin', label: 'Dashboard', hint: 'Stock, prices and recent activity', Icon: LayoutDashboard, roles: ['admin', 'super-admin'] },
    { href: '/admin/finance', label: 'Finance', hint: 'Shifts, credit sales and creditors', Icon: Banknote, roles: ['admin', 'super-admin'] },
    { href: '/admin/reports', label: 'Reports', hint: 'End of day, monthly, credit, VAT', Icon: FileText, roles: ['admin', 'super-admin'] },
    { href: '/admin/inventory', label: 'Stock', hint: 'Fuel deliveries and tank levels', Icon: Package, roles: ['admin', 'super-admin'] },
    { href: '/admin/requests', label: 'Edit requests', hint: 'Approve corrections to locked shifts', Icon: ClipboardList, roles: ['admin', 'super-admin'] },
    { href: '/admin/infrastructure', label: 'Setup', hint: 'Stations, tanks, pumps and products', Icon: Building2, roles: ['admin', 'super-admin'] },
    { href: '/admin/system', label: 'System', hint: 'Users, roles and the activity log', Icon: Settings, roles: ['admin', 'super-admin'] },
    { href: '/super-admin', label: 'Organizations', hint: 'Tenants and their administrators', Icon: Users, roles: ['super-admin'] },
    { href: '/station-manager', label: 'My shift', hint: 'Open, run and close a shift', Icon: LayoutDashboard, roles: ['manager'] },
    { href: '/station-manager/shifts', label: 'Shift history', hint: 'Past shifts and their variance', Icon: FileText, roles: ['manager'] },
    { href: '/station-manager/liftings', label: 'Deliveries', hint: 'Record fuel received', Icon: Package, roles: ['manager'] },
    { href: '/station-manager/customers', label: 'Customers', hint: 'Credit account holders', Icon: Users, roles: ['manager'] },
];

/** The menu trigger in the top bar. The avatar lives inside the drawer. */
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

            <AppDrawer visible={open} onClose={() => setOpen(false)} />
        </>
    );
}

function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { roles, name, email } = useRoles();

    // Kept mounted through the closing animation, then unmounted — a hidden but
    // mounted native Modal interferes with other modals on the same screen.
    const [mounted, setMounted] = useState(visible);

    // RN's Animated, not Reanimated: a Reanimated entering animation inside a
    // native Modal leaves touch targets offset from where they are painted on
    // Android. A plain translateX keeps the hit areas with the view.
    const slide = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setMounted(true);
            Animated.timing(slide, {
                toValue: 1,
                duration: OPEN_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.timing(slide, {
            toValue: 0,
            duration: CLOSE_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setMounted(false);
        });
    }, [visible, slide]);

    const go = useCallback(
        (href: string) => {
            onClose();
            if (href !== pathname) {
                // Navigate after the panel has slid away, so the route change does
                // not fight the closing animation.
                setTimeout(() => router.push(href as never), CLOSE_MS);
            }
        },
        [onClose, pathname, router]
    );

    if (!mounted) return null;

    const available = DESTINATIONS.filter(
        (destination) => !destination.roles || destination.roles.some((role) => roles.includes(role))
    );

    return (
        <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 flex-row">
                {/* Panel slides in from the left edge. */}
                <Animated.View
                    style={{
                        width: PANEL_WIDTH,
                        paddingTop: insets.top,
                        transform: [
                            {
                                translateX: slide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-PANEL_WIDTH, 0],
                                }),
                            },
                        ],
                    }}
                    className="h-full border-r border-surface-border bg-surface"
                >
                    <View className="flex-row items-center gap-3 border-b border-surface-border px-4 py-4">
                        <Avatar name={name} size={44} />
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-base font-bold" numberOfLines={1}>
                                {name ?? 'Signed in'}
                            </Text>
                            <Text className="text-ink-muted text-[11px]" numberOfLines={1}>
                                {email ?? ''}
                            </Text>
                            {roles.length > 0 ? (
                                <Text className="text-ink-faint text-[10px] font-semibold uppercase tracking-wider">
                                    {roles.join(' · ')}
                                </Text>
                            ) : null}
                        </View>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close menu"
                            hitSlop={8}
                            className="shrink-0 rounded-full bg-surface-sunken p-2"
                        >
                            <X size={15} color="#5c5c6b" />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
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
                                        className={`flex-row items-center gap-3 px-4 py-3 ${
                                            active ? 'bg-brand-subtle' : 'active:bg-surface-sunken'
                                        }`}
                                    >
                                        {/* A left rail marks the current screen without
                                            relying on colour alone. */}
                                        <View
                                            style={{ width: 3, height: 28, borderRadius: 2 }}
                                            className={active ? 'bg-brand' : 'bg-transparent'}
                                        />
                                        <Icon size={18} color={active ? '#040273' : '#5c5c6b'} />
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
                </Animated.View>

                {/* Tapping the exposed page closes the drawer. */}
                <Animated.View
                    style={{
                        flex: 1,
                        opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                    }}
                >
                    <Pressable
                        className="h-full w-full bg-black/40"
                        onPress={onClose}
                        accessibilityLabel="Close menu"
                    />
                </Animated.View>
            </View>
        </Modal>
    );
}
