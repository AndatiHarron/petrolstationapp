import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Dashboard } from '../../components/dashboard';
import { StatusBar } from 'expo-status-bar';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      <Dashboard />

      {/* Dev Navigation */}
      <View className="absolute bottom-10 right-10 gap-2">
        <Link href="/super-admin" asChild>
          <Pressable className="bg-orange-500 px-6 py-3 rounded-full shadow-lg">
            <Text className="text-black font-bold">Role: Super Admin</Text>
          </Pressable>
        </Link>
        <Link href="/admin" asChild>
          <Pressable className="h-12 justify-center rounded-full bg-brand px-6">
            <Text className="text-sm font-bold text-white">Role: Owner Admin</Text>
          </Pressable>
        </Link>
        <Link href="/station-manager" asChild>
          <Pressable className="h-12 justify-center rounded-full bg-brand px-6">
            <Text className="text-sm font-bold text-white">Role: Station Manager</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
