import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LayoutDashboard, Wallet, Fuel, Users, Settings, LogOut } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

const MENU_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Wallet, label: 'Sales & Finance', path: '/admin/sales' },
    { icon: Fuel, label: 'Inventory', path: '/admin/inventory' },
    { icon: Users, label: 'Staff Management', path: '/admin/staff' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <View className="w-64 bg-surface-sunken border-r border-surface-border h-full flex-col hidden md:flex">
            <View className="p-6 border-b border-surface-border">
                <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 bg-emerald-500 rounded-lg items-center justify-center">
                        <Text className="text-ink font-black text-lg">O</Text>
                    </View>
                    <View>
                        <Text className="text-ink font-bold text-lg tracking-tight">OCTANE</Text>
                        <Text className="text-ink-muted text-xs font-semibold tracking-widest uppercase">OWNER ADMIN</Text>
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
                                color={isActive ? '#10b981' : '#8b8b99'}
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
