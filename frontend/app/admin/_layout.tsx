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
                        height: 62,
                        paddingTop: 6,
                        paddingBottom: 8,
                    },
                    // Seven tabs share a phone's width, so the label has to be
                    // small and the item padding tight or the text wraps.
                    tabBarLabelStyle: {
                        fontSize: 9,
                        fontWeight: '600',
                        marginTop: 2,
                    },
                    tabBarItemStyle: { paddingHorizontal: 0 },
                    tabBarIconStyle: { marginBottom: -2 },
                    tabBarActiveTintColor: '#040273',
                    tabBarInactiveTintColor: '#8b8b99',
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="finance"
                    options={{
                        title: 'Finance',
                        tabBarIcon: ({ color }) => <Banknote size={20} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="reports"
                    options={{
                        title: 'Reports',
                        tabBarIcon: ({ color }) => <FileText size={20} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="requests"
                    options={{
                        title: 'Requests',
                        tabBarIcon: ({ color }) => <ClipboardList size={20} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="system"
                    options={{
                        title: 'System',
                        tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="inventory"
                    options={{
                        title: 'Stock',
                        tabBarIcon: ({ color }) => <Package size={20} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="infrastructure"
                    options={{
                        title: 'Setup',
                        tabBarIcon: ({ color }) => <Building2 size={20} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}
