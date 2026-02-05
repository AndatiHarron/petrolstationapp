import React from 'react';
import { View } from 'react-native';
import { AdminSidebar } from './admin-sidebar';
import { Header } from '../super-admin/header'; // Reusing header for consistency

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <View className="flex-1 flex-row bg-slate-900">
            <AdminSidebar />
            <View className="flex-1 flex-col h-full">
                <Header />
                <View className="flex-1">
                    {children}
                </View>
            </View>
        </View>
    );
}
