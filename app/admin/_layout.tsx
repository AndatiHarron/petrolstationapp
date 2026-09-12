import { Tabs } from 'expo-router';
import { LayoutDashboard, Banknote, Settings, Package, Building2, ClipboardList, FileText } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

export default function AdminLayout() {
    return (
        <>
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
                    name="finance"
                    options={{
                        title: 'Finance',
                        tabBarIcon: ({ color, size }) => <Banknote size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="reports"
                    options={{
                        title: 'Reports',
                        tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="requests"
                    options={{
                        title: 'Requests',
                        tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="system"
                    options={{
                        title: 'System',
                        tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="inventory"
                    options={{
                        title: 'Inventory',
                        tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="infrastructure"
                    options={{
                        title: 'Infrastructure',
                        tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}
