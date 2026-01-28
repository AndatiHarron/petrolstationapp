import React from 'react';
import { View, ScrollView } from 'react-native';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <View className="flex-1 flex-row bg-slate-900">
            <Sidebar />
            <View className="flex-1 flex-col h-full">
                <Header />
                <View className="flex-1">
                    {children}
                </View>
            </View>
        </View>
    );
}
