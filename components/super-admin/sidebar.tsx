import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutDashboard, Building2, Activity, Settings, Users, FileText, LogOut } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

const MENU_ITEMS = [
    { icon: Building2, label: 'Tenants', path: '/super-admin' },
    { icon: Activity, label: 'System Health', path: '/super-admin/health' },
    { icon: Users, label: 'User Management', path: '/super-admin/users' },
    { icon: FileText, label: 'Audit Logs', path: '/super-admin/audit' },
    { icon: Settings, label: 'Global Settings', path: '/super-admin/settings' },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <View className="w-64 bg-surface-sunken border-r border-surface-border h-full flex-col hidden md:flex">
            <View className="p-6 border-b border-surface-border">
                <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 bg-orange-500 rounded-lg items-center justify-center">
                        <Text className="text-ink font-black text-lg">P</Text>
                    </View>
                    <View>
                        <Text className="text-ink font-bold text-lg tracking-tight">PETROL</Text>
                        <Text className="text-ink-muted text-xs font-semibold tracking-widest uppercase">SUPER ADMIN</Text>
                    </View>
                </View>
            </View>

            <View className="flex-1 py-6 px-3 gap-1">
                {MENU_ITEMS.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <Pressable
                            key={item.label}
                            onPress={() => router.push(item.path as any)}
                            className={`flex-row items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive ? 'bg-surface' : 'hover:bg-surface-sunken'
                                }`}
                        >
                            <Icon
                                size={20}
                                color={isActive ? '#f97316' : '#8b8b99'}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <Text
                                className={`font-medium ${isActive ? 'text-ink' : 'text-ink-muted'
                                    }`}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View className="p-4 border-t border-surface-border">
                <Pressable className="flex-row items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent-subtle group">
                    <LogOut size={20} className="text-ink-muted group-hover:text-accent" color="#8b8b99" />
                    <Text className="text-ink-muted font-medium group-hover:text-accent">Sign Out</Text>
                </Pressable>
            </View>
        </View>
    );
}
