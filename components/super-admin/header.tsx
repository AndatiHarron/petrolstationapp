import React from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import { Search, Bell, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Header() {
    const insets = useSafeAreaInsets();

    return (
        <View
            className="bg-surface-sunken border-b border-surface-border flex-row items-center justify-between px-6 z-10"
            style={{ paddingTop: insets.top, height: 64 + insets.top }}
        >
            <View className="flex-row items-center gap-4 flex-1">
                <Menu size={24} color="#8b8b99" className="md:hidden" />

                <View className="flex-row items-center bg-surface rounded-xl px-4 h-12 w-full max-w-md border border-transparent focus:border-surface-border">
                    <Search size={20} color="#5c5c6b" />
                    <TextInput
                        className="flex-1 ml-3 text-ink text-base placeholder:text-ink-muted outline-none h-full"
                        placeholder="Search"
                        placeholderTextColor="#5c5c6b"
                    />
                </View>
            </View>

            <View className="flex-row items-center gap-4">
                <View className="relative">
                    <Bell size={20} color="#8b8b99" />
                    <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-slate-900" />
                </View>

                <View className="flex-row items-center gap-3 pl-4 border-l border-surface-border">
                    <View className="items-end hidden md:flex">
                        <Text className="text-ink text-sm font-semibold">John Doe</Text>
                        <Text className="text-ink-muted text-xs text-right">Super Admin</Text>
                    </View>
                    <View className="w-9 h-9 bg-surface-border rounded-full border-2 border-surface-border overflow-hidden">
                        {/* Avatar Placeholder */}
                        <View className="w-full h-full items-center justify-center bg-surface-border">
                            <Text className="text-ink font-medium text-xs">JD</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}
