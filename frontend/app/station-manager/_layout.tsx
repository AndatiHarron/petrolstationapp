import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Droplets, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../../components/error-boundary';
import { TopBar } from '@/components/top-bar';
import {
    GlassTabBarBackground,
    glassTabBarItemStyle,
    glassTabBarLabelStyle,
    glassTabBarStyle,
    TAB_ICON_SIZE,
} from '@/components/glass-tab-bar';

export default function StationManagerLayout() {
    const insets = useSafeAreaInsets();

    return (
        <ErrorBoundary label="Station Manager">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <Tabs
                screenOptions={{
                    header: ({ options }) => <TopBar title={options.title ?? 'Station'} />,
                    // Floating glass: the bar sits clear of Android's on-screen
                    // navigation buttons and the page scrolls under it.
                    tabBarStyle: glassTabBarStyle(insets),
                    tabBarBackground: () => <GlassTabBarBackground />,
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
                    name="customers"
                    options={{
                        title: 'Customers',
                        tabBarIcon: ({ color }) => <Users size={TAB_ICON_SIZE} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="liftings"
                    options={{
                        title: 'Offloading',
                        tabBarIcon: ({ color }) => <Droplets size={TAB_ICON_SIZE} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="shifts"
                    options={{
                        title: 'Shifts',
                        tabBarIcon: ({ color }) => <Clock size={TAB_ICON_SIZE} color={color} />,
                    }}
                />
            </Tabs>
        </ErrorBoundary>
    );
}
