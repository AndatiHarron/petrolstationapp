import { Tabs } from 'expo-router';
import { LayoutDashboard, Banknote, FileText } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '@/components/top-bar';

/**
 * Three tabs, not seven.
 *
 * Seven destinations across a phone's width left about 51px each, so every
 * label wrapped and the icons crowded. The bottom bar now holds only the
 * screens opened many times a day; Stock, Edit requests, Setup and System moved
 * into the top menu, which is role-filtered and reachable from every screen.
 * They stay routable — `href: null` hides a screen from the bar without
 * removing the route, so the menu and any deep link still reach them.
 */
export default function AdminLayout() {
    const insets = useSafeAreaInsets();

    return (
        <>
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <Tabs
                screenOptions={{
                    header: ({ options }) => <TopBar title={options.title ?? 'Admin'} />,
                    tabBarStyle: {
                        backgroundColor: '#ffffff',
                        borderTopColor: '#e6e6ee',
                        // Clear Android's on-screen navigation buttons. The bar sat
                        // underneath them because a fixed height overrode React
                        // Navigation's safe-area handling.
                        height: 58 + insets.bottom,
                        paddingTop: 6,
                        paddingBottom: Math.max(insets.bottom, 10),
                    },
                    // Three tabs leave room for a readable label.
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: '600',
                        marginTop: 2,
                    },
                    tabBarActiveTintColor: '#040273',
                    tabBarInactiveTintColor: '#8b8b99',
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="finance"
                    options={{
                        title: 'Finance',
                        tabBarIcon: ({ color }) => <Banknote size={22} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="reports"
                    options={{
                        title: 'Reports',
                        tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
                    }}
                />

                {/* Reachable from the top menu, hidden from the tab bar. */}
                <Tabs.Screen name="inventory" options={{ title: 'Stock', href: null }} />
                <Tabs.Screen name="requests" options={{ title: 'Edit requests', href: null }} />
                <Tabs.Screen name="infrastructure" options={{ title: 'Setup', href: null }} />
                <Tabs.Screen name="system" options={{ title: 'System', href: null }} />
            </Tabs>
        </>
    );
}
