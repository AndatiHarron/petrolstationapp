import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  // Let `useProtectedRoute()` decide where to go.
  // This avoids an extra redirect hop (especially noticeable on cold start).
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}
