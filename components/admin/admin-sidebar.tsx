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
        <View className="w-64 bg-slate-900 border-r border-slate-800 h-full flex-col hidden md:flex">
            <View className="p-6 border-b border-slate-800">
                <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 bg-emerald-500 rounded-lg items-center justify-center">
                        <Text className="text-white font-black text-lg">O</Text>
                    </View>
                    <View>
                        <Text className="text-white font-bold text-lg tracking-tight">OCTANE</Text>
                        <Text className="text-slate-500 text-xs font-semibold tracking-widest uppercase">OWNER ADMIN</Text>
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
                            className={`flex-row items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                                }`}
                        >
                            <Icon
                                size={20}
                                color={isActive ? '#10b981' : '#94a3b8'}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <Text
                                className={`font-medium ${isActive ? 'text-white' : 'text-slate-400'
                                    }`}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View className="p-4 border-t border-slate-800">
                <Pressable className="flex-row items-center gap-3 px-3 py-3 rounded-lg hover:bg-red-500/10 group">
                    <LogOut size={20} className="text-slate-400 group-hover:text-red-400" color="#94a3b8" />
                    <Text className="text-slate-400 font-medium group-hover:text-red-400">Sign Out</Text>
                </Pressable>
            </View>
        </View>
    );
}
