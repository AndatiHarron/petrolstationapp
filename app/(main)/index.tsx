import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold mb-4">Dashboard</Text>
      <Text className="mb-8 text-slate-600">Welcome to the Petrol Integrity System</Text>
      <Link href="/(auth)/login" className="text-blue-600 font-bold">
        Log Out
      </Link>
    </View>
  );
}
