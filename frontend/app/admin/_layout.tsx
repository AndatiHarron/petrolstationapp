import { Tabs } from 'expo-router';
import { LayoutDashboard, Banknote, Package, FileText } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '@/components/top-bar';
import {
    GlassTabBarBackground,
    glassTabBarItemStyle,
    glassTabBarLabelStyle,
    glassTabBarStyle,
    TAB_ICON_SIZE,
} from '@/components/glass-tab-bar';

/**
 * Four tabs, not seven.
 *
 * Seven destinations across a phone's width left about 51px each, so every
 * label wrapped and the icons crowded. The bottom bar holds the screens opened
 * many times a day — Stock among them, since deliveries and tank levels are
 * checked daily — while Edit requests, Setup and System stay in the top menu,
 * which is role-filtered and reachable from every screen. Those remain
 * routable: `href: null` hides a screen from the bar without removing the
 * route, so the menu and any deep link still reach them.
 */
export default function AdminLayout() {
    const insets = useSafeAreaInsets();

    return (
        <>
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <Tabs
                screenOptions={{
                    header: ({ options }) => <TopBar title={options.title ?? 'Admin'} />,
                    // Floating glass: the bar sits clear of Android's on-screen
                    // navigation buttons and the page scrolls under it.
                    tabBarStyle: glassTabBarStyle(insets),
                    tabBarBackground: () => <GlassTabBarBackground />,
                    // Three tabs leave room for a readable label.
                    tabBarLabelStyle: glassTabBarLabelStyle,
                    tabBarItemStyle: glassTabBarItemStyle,
                    tabBarActiveTintColor: '#040273',
                    tabBarInactiveTintColor: '#8b8b99',
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color }) => <LayoutDashboard size={TAB_ICON_SIZE} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="finance"
                    options={{
                        title: 'Finance',
                        tabBarIcon: ({ color }) => <Banknote size={TAB_ICON_SIZE} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="inventory"
                    options={{
                        title: 'Stock',
                        tabBarIcon: ({ color }) => <Package size={TAB_ICON_SIZE} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="reports"
                    options={{
                        title: 'Reports',
                        tabBarIcon: ({ color }) => <FileText size={TAB_ICON_SIZE} color={color} />,
                    }}
                />

                {/* Reachable from the top menu, hidden from the tab bar. */}
                <Tabs.Screen name="requests" options={{ title: 'Edit requests', href: null }} />
                <Tabs.Screen name="infrastructure" options={{ title: 'Setup', href: null }} />
                <Tabs.Screen name="system" options={{ title: 'System', href: null }} />
            </Tabs>
        </>
    );
}
