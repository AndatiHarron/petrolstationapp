import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

export default function InventoryTab() {
    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6 mt-4">
                        <Text className="text-2xl font-bold text-white">Inventory</Text>
                        <Text className="text-slate-500 text-sm mt-1">Stock management and tracking</Text>
                    </View>

                    <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-8 items-center justify-center">
                        <Text className="text-slate-400 text-lg">Coming Soon</Text>
                        <Text className="text-slate-500 text-sm mt-2">Product and stock management</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
