import React from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import { Search, Bell, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Header() {
    const insets = useSafeAreaInsets();

    return (
        <View
            className="bg-slate-900 border-b border-slate-800 flex-row items-center justify-between px-6 z-10"
            style={{ paddingTop: insets.top, height: 64 + insets.top }}
        >
            <View className="flex-row items-center gap-4 flex-1">
                <Menu size={24} color="#94a3b8" className="md:hidden" />

                <View className="flex-row items-center bg-slate-800 rounded-xl px-4 h-12 w-full max-w-md border border-transparent focus:border-slate-600">
                    <Search size={20} color="#64748b" />
                    <TextInput
                        className="flex-1 ml-3 text-white text-base placeholder:text-slate-500 outline-none h-full"
                        placeholder="Search"
                        placeholderTextColor="#64748b"
                    />
                </View>
            </View>

            <View className="flex-row items-center gap-4">
                <View className="relative">
                    <Bell size={20} color="#94a3b8" />
                    <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-slate-900" />
                </View>

                <View className="flex-row items-center gap-3 pl-4 border-l border-slate-800">
                    <View className="items-end hidden md:flex">
                        <Text className="text-white text-sm font-semibold">John Doe</Text>
                        <Text className="text-slate-500 text-xs text-right">Super Admin</Text>
                    </View>
                    <View className="w-9 h-9 bg-slate-700 rounded-full border-2 border-slate-600 overflow-hidden">
                        {/* Avatar Placeholder */}
                        <View className="w-full h-full items-center justify-center bg-slate-700">
                            <Text className="text-white font-medium text-xs">JD</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}
