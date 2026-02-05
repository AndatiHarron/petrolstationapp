import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Dashboard } from '../../components/dashboard';
import { StatusBar } from 'expo-status-bar';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />
      <Dashboard />

      {/* Dev Navigation */}
      <View className="absolute bottom-10 right-10 gap-2">
        <Link href="/super-admin" asChild>
          <Pressable className="bg-orange-500 px-6 py-3 rounded-full shadow-lg">
            <Text className="text-white font-bold">Role: Super Admin</Text>
          </Pressable>
        </Link>
        <Link href="/admin" asChild>
          <Pressable className="bg-emerald-500 px-6 py-3 rounded-full shadow-lg">
            <Text className="text-white font-bold">Role: Owner Admin</Text>
          </Pressable>
        </Link>
        <Link href="/station-manager" asChild>
          <Pressable className="bg-blue-500 px-6 py-3 rounded-full shadow-lg">
            <Text className="text-white font-bold">Role: Station Manager</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
