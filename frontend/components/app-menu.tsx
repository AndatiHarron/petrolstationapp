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
    Platform,
    StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
    Banknote,
    Building2,
    ChevronRight,
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
import { LogoutButton } from '@/components/logout-button';

const PANEL_WIDTH = Math.min(Math.round(Dimensions.get('window').width * 0.84), 336);
const OPEN_MS = 240;
const CLOSE_MS = 180;

/** Rounding the free edge makes the panel read as a sheet over the page. */
const PANEL_RADIUS = 26;

// Tints over the navy header. Written as rgba rather than Tailwind opacity
// modifiers so they resolve the same on both platforms.
const ON_BRAND = {
    chip: 'rgba(255,255,255,0.16)',
    hairline: 'rgba(255,255,255,0.18)',
    subdued: 'rgba(255,255,255,0.72)',
};

/**
 * The frosted panel.
 *
 * Android's blur is weaker — and inside a native Modal it cannot sample the
 * window behind it at all — so the white wash does most of the work there and
 * the page still shows through it. iOS gets a thinner wash over a real blur.
 * Either way the navy tinge keeps the glass tied to the brand rather than
 * reading as generic frosted chrome.
 */
const GLASS = {
    white: Platform.OS === 'ios' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.88)',
    tinge: 'rgba(4,2,115,0.05)',
    header: Platform.OS === 'ios' ? 'rgba(4,2,115,0.86)' : 'rgba(4,2,115,0.94)',
    footer: 'rgba(247,247,250,0.72)',
    scrim: 'rgba(4,2,115,0.32)',
};

interface Destination {
    href: string;
    label: string;
    hint: string;
    Icon: typeof LayoutDashboard;
    /** Roles allowed to see it. Omit for everyone signed in. */
    roles?: AppRole[];
    /**
     * Roles that already reach this screen from the bottom tab bar. Listing it
     * in the drawer as well is duplication, so it is hidden for those roles.
     */
    bottomTabFor?: AppRole[];
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
    { href: '/admin', label: 'Dashboard', hint: 'Stock and prices', Icon: LayoutDashboard, roles: ['admin', 'super-admin'], bottomTabFor: ['admin', 'super-admin'] },
    { href: '/admin/finance', label: 'Finance', hint: 'Shifts and credit', Icon: Banknote, roles: ['admin', 'super-admin'], bottomTabFor: ['admin', 'super-admin'] },
    { href: '/admin/reports', label: 'Reports', hint: 'End of day, monthly', Icon: FileText, roles: ['admin', 'super-admin'], bottomTabFor: ['admin', 'super-admin'] },
    { href: '/admin/inventory', label: 'Stock', hint: 'Deliveries and tanks', Icon: Package, roles: ['admin', 'super-admin'], bottomTabFor: ['admin', 'super-admin'] },
    { href: '/admin/requests', label: 'Edit requests', hint: 'Approve corrections', Icon: ClipboardList, roles: ['admin'] },
    { href: '/admin/infrastructure', label: 'Setup', hint: 'Stations and pumps', Icon: Building2, roles: ['admin'] },
    { href: '/admin/system', label: 'System', hint: 'Users and audit log', Icon: Settings, roles: ['admin'] },
    { href: '/super-admin', label: 'Organizations', hint: 'Tenants and admins', Icon: Users, roles: ['super-admin'] },
    // Edit requests, Setup and System are deliberately admin-only. They act on
    // one tenant's records, and the organization scope leaves a platform owner
    // unscoped — so those screens would show every tenant's rows at once.
    { href: '/station-manager', label: 'My shift', hint: 'Open, run and close', Icon: LayoutDashboard, roles: ['manager'], bottomTabFor: ['manager'] },
    { href: '/station-manager/shifts', label: 'Shift history', hint: 'Past shifts', Icon: FileText, roles: ['manager'], bottomTabFor: ['manager'] },
    { href: '/station-manager/liftings', label: 'Offloading', hint: 'Record fuel received', Icon: Package, roles: ['manager'], bottomTabFor: ['manager'] },
    { href: '/station-manager/customers', label: 'Customers', hint: 'Credit accounts', Icon: Users, roles: ['manager'], bottomTabFor: ['manager'] },
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

    const available = DESTINATIONS.filter((destination) => {
        const allowed = !destination.roles || destination.roles.some((role) => roles.includes(role));
        const alreadyATab = destination.bottomTabFor?.some((role) => roles.includes(role)) ?? false;

        return allowed && !alreadyATab;
    });

    return (
        <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 flex-row">
                {/* Panel slides in from the left edge. */}
                <Animated.View
                    style={{
                        width: PANEL_WIDTH,
                        borderTopRightRadius: PANEL_RADIUS,
                        borderBottomRightRadius: PANEL_RADIUS,
                        // Clipped so the navy header takes the panel's corner.
                        overflow: 'hidden',
                        shadowColor: '#04026e',
                        shadowOpacity: 0.18,
                        shadowRadius: 24,
                        shadowOffset: { width: 8, height: 0 },
                        elevation: 16,
                        transform: [
                            {
                                translateX: slide.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-PANEL_WIDTH, 0],
                                }),
                            },
                        ],
                    }}
                    className="h-full"
                >
                    {/* Glass, painted behind the panel's content. The blur is
                        the bottom layer so it has the page to sample. */}
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 45 : 30}
                        tint="light"
                        experimentalBlurMethod="dimezisBlurView"
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.white }]} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS.tinge }]} />

                    {/* The identity block carries the brand colour, so the drawer
                        opens with who you are rather than a white strip. */}
                    <View
                        style={{ paddingTop: insets.top + 16, backgroundColor: GLASS.header }}
                        className="px-5 pb-5"
                    >
                        <View className="flex-row items-start justify-between gap-3">
                            <Avatar name={name} size={48} inverted />
                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close menu"
                                hitSlop={10}
                                style={{ backgroundColor: ON_BRAND.chip }}
                                className="h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            >
                                <X size={16} color="#ffffff" />
                            </Pressable>
                        </View>

                        <Text
                            className="mt-3 text-[17px] font-bold text-white"
                            numberOfLines={1}
                        >
                            {name ?? 'Signed in'}
                        </Text>
                        {email ? (
                            <Text
                                style={{ color: ON_BRAND.subdued }}
                                className="text-[11px]"
                                numberOfLines={1}
                            >
                                {email}
                            </Text>
                        ) : null}

                        {roles.length > 0 ? (
                            <View className="mt-3 flex-row flex-wrap gap-1.5">
                                {roles.map((role) => (
                                    <View
                                        key={role}
                                        style={{ backgroundColor: ON_BRAND.chip }}
                                        className="rounded-full px-2.5 py-1"
                                    >
                                        <Text className="text-[9px] font-bold uppercase tracking-wider text-white">
                                            {role.replace(/-/g, ' ')}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{
                            paddingHorizontal: 10,
                            paddingTop: 14,
                            paddingBottom: 16,
                        }}
                        showsVerticalScrollIndicator={false}
                    >
                        {available.length === 0 ? (
                            <View className="items-center px-5 py-8">
                                <Text className="text-ink-muted text-center text-xs">
                                    Every screen you can reach is on the bar below.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Text className="text-ink-faint mb-2 px-3 text-[9px] font-bold uppercase tracking-widest">
                                    Go to
                                </Text>

                                {available.map((destination) => {
                                    const active = pathname === destination.href;
                                    const { Icon } = destination;

                                    return (
                                        <Pressable
                                            key={destination.href}
                                            onPress={() => go(destination.href)}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected: active }}
                                            className={`mb-1 flex-row items-center gap-3 rounded-2xl px-3 py-2.5 ${
                                                active
                                                    ? 'bg-brand-subtle'
                                                    : 'active:bg-surface-sunken'
                                            }`}
                                        >
                                            {/* The current screen is marked by a filled
                                                tile and a bolder label, not colour alone. */}
                                            <View
                                                style={{ width: 34, height: 34, borderRadius: 12 }}
                                                className={`items-center justify-center ${
                                                    active ? 'bg-brand' : 'bg-surface-sunken'
                                                }`}
                                            >
                                                <Icon
                                                    size={17}
                                                    color={active ? '#ffffff' : '#5c5c6b'}
                                                />
                                            </View>

                                            <View className="min-w-0 flex-1">
                                                <Text
                                                    className={`text-[13.5px] ${
                                                        active
                                                            ? 'text-brand font-bold'
                                                            : 'text-ink font-semibold'
                                                    }`}
                                                    numberOfLines={1}
                                                >
                                                    {destination.label}
                                                </Text>
                                                {/* Hints are written short enough to
                                                    sit on one line; two lines is the
                                                    backstop so a long one wraps
                                                    instead of ending in an ellipsis. */}
                                                <Text
                                                    className="text-ink-faint text-[10.5px]"
                                                    numberOfLines={2}
                                                >
                                                    {destination.hint}
                                                </Text>
                                            </View>

                                            <ChevronRight
                                                size={15}
                                                color={active ? '#040273' : '#c9c9d8'}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>

                    <View
                        style={{ paddingBottom: insets.bottom + 12, backgroundColor: GLASS.footer }}
                        className="flex-row items-center gap-3 border-t border-surface-border px-4 pt-3"
                    >
                        <View className="min-w-0 flex-1">
                            <Text className="text-ink text-[11px] font-bold">
                                Petrol Integrity
                            </Text>
                            <Text className="text-ink-faint text-[10px]" numberOfLines={1}>
                                Signed in on this device
                            </Text>
                        </View>
                        <LogoutButton />
                    </View>
                </Animated.View>

                {/* Tapping the exposed page closes the drawer. The scrim is navy
                    rather than black so the whole overlay reads as one material. */}
                <Animated.View
                    style={{
                        flex: 1,
                        opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                    }}
                >
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 12 : 8}
                        tint="dark"
                        experimentalBlurMethod="dimezisBlurView"
                        style={StyleSheet.absoluteFill}
                    />
                    <Pressable
                        style={{ backgroundColor: GLASS.scrim }}
                        className="h-full w-full"
                        onPress={onClose}
                        accessibilityLabel="Close menu"
                    />
                </Animated.View>
            </View>
        </Modal>
    );
}
