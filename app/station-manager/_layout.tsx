import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Droplets, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable } from 'react-native';

import { TutorialProvider } from '@/components/tutorial/tutorial-provider';
import { TutorialTarget } from '@/components/tutorial/tutorial-target';
import { MANAGER_TUTORIAL_STEPS } from '@/lib/tutorial/manager-tutorial-steps';

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

export default function StationManagerLayout() {
    return (
        <TutorialProvider role="manager" steps={MANAGER_TUTORIAL_STEPS} autoStart>
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
                    name="customers"
                    options={{
                        title: 'Customers',
                        tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                        tabBarButton: tabButton('manager-tab-customers'),
                    }}
                />
                <Tabs.Screen
                    name="liftings"
                    options={{
                        title: 'Liftings',
                        tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
                        tabBarButton: tabButton('manager-tab-liftings'),
                    }}
                />
                <Tabs.Screen
                    name="shifts"
                    options={{
                        title: 'Shifts',
                        tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
                        tabBarButton: tabButton('manager-tab-shifts'),
                    }}
                />
            </Tabs>
        </TutorialProvider>
    );
}
