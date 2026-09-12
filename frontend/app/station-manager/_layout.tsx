import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Droplets, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ErrorBoundary } from '../../components/error-boundary';

export default function StationManagerLayout() {
    return (
        <ErrorBoundary label="Station Manager">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <Tabs
                screenOptions={{
                    tabBarStyle: {
                        backgroundColor: '#ffffff',
                        borderTopColor: '#e6e6ee',
                    },
                    tabBarActiveTintColor: '#040273',
                    tabBarInactiveTintColor: '#8b8b99',
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="customers"
                    options={{
                        title: 'Customers',
                        tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="liftings"
                    options={{
                        title: 'Liftings',
                        tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="shifts"
                    options={{
                        title: 'Shifts',
                        tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
                    }}
                />
            </Tabs>
        </ErrorBoundary>
    );
}
