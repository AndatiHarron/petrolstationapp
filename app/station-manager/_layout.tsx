import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Droplets, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../../components/error-boundary';
import { TopBar } from '@/components/top-bar';

export default function StationManagerLayout() {
    const insets = useSafeAreaInsets();

    return (
        <ErrorBoundary label="Station Manager">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <Tabs
                screenOptions={{
                    header: ({ options }) => <TopBar title={options.title ?? 'Station'} />,
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
                    name="customers"
                    options={{
                        title: 'Customers',
                        tabBarIcon: ({ color }) => <Users size={22} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="liftings"
                    options={{
                        title: 'Liftings',
                        tabBarIcon: ({ color }) => <Droplets size={22} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="shifts"
                    options={{
                        title: 'Shifts',
                        tabBarIcon: ({ color }) => <Clock size={22} color={color} />,
                    }}
                />
            </Tabs>
        </ErrorBoundary>
    );
}
