import { Tabs } from 'expo-router';
import { LayoutDashboard, Banknote, Settings, Package, Building2, ClipboardList } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable } from 'react-native';

import { TutorialProvider } from '@/components/tutorial/tutorial-provider';
import { TutorialTarget } from '@/components/tutorial/tutorial-target';
import { ADMIN_TUTORIAL_STEPS } from '@/lib/tutorial/admin-tutorial-steps';

function tabButton(tutorialId: string) {
    return function TutorialTabBarButton(props: any) {
        return (
            <TutorialTarget id={tutorialId} style={props.style}>
                <Pressable
                    onPress={props.onPress}
                    onLongPress={props.onLongPress}
                    accessibilityRole={props.accessibilityRole}
                    accessibilityState={props.accessibilityState}
                    accessibilityLabel={props.accessibilityLabel}
                    testID={props.testID}
                    style={{ flex: 1 }}
                >
                    {props.children}
                </Pressable>
            </TutorialTarget>
        );
    };
}

export default function AdminLayout() {
    return (
        <TutorialProvider role="admin" steps={ADMIN_TUTORIAL_STEPS} autoStart>
            <StatusBar style="light" backgroundColor="#0f172a" />
            <Tabs
                screenOptions={{
                    tabBarStyle: {
                        backgroundColor: '#0f172a',
                        borderTopColor: '#1e293b',
                    },
                    tabBarActiveTintColor: '#10b981',
                    tabBarInactiveTintColor: '#64748b',
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
                        tabBarButton: tabButton('admin-tab-finance'),
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
                        tabBarButton: tabButton('admin-tab-system'),
                    }}
                />
                <Tabs.Screen
                    name="inventory"
                    options={{
                        title: 'Inventory',
                        tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
                        tabBarButton: tabButton('admin-tab-inventory'),
                    }}
                />
                <Tabs.Screen
                    name="infrastructure"
                    options={{
                        title: 'Infrastructure',
                        tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
                        tabBarButton: tabButton('admin-tab-infrastructure'),
                    }}
                />
            </Tabs>
        </TutorialProvider>
    );
}

