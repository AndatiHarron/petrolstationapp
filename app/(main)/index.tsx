import React from 'react';
import { View } from 'react-native';
import { Dashboard } from '../../components/dashboard';
import { StatusBar } from 'expo-status-bar';

export default function Home() {
  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />
      <Dashboard />
    </View>
  );
}
