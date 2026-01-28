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
        <View className="w-64 bg-slate-900 border-r border-slate-800 h-full flex-col hidden md:flex">
            <View className="p-6 border-b border-slate-800">
                <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 bg-orange-500 rounded-lg items-center justify-center">
                        <Text className="text-white font-black text-lg">P</Text>
                    </View>
                    <View>
                        <Text className="text-white font-bold text-lg tracking-tight">PETROL</Text>
                        <Text className="text-slate-500 text-xs font-semibold tracking-widest uppercase">SUPER ADMIN</Text>
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
                                color={isActive ? '#f97316' : '#94a3b8'}
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
