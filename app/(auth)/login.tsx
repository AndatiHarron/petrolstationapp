import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { LoginForm } from '../../components/login-form';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="w-full max-w-md self-center">
          <View className="mb-10">
            <Text className="mb-2 text-3xl font-extrabold text-slate-900">
              Petrol Integrity System
            </Text>
            <Text className="text-lg text-slate-600">
              Sign in to access the dashboard
            </Text>
          </View>
          
          <View className="rounded-lg bg-white p-6 shadow-sm border border-slate-200">
            <LoginForm />
          </View>
          
          <View className="mt-8 items-center">
            <Text className="text-xs text-slate-400">
              © 2026 Petrol Integrity System. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
