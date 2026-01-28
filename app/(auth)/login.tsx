import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LoginForm } from '../../components/login-form';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      locations={[0, 0.5, 1]}
      className="flex-1"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="mx-auto w-full max-w-md">
            <Animated.View
              entering={FadeInDown.duration(600).springify()}
              className="mb-10"
            >
              <Text className="mb-3 text-4xl font-extrabold text-white tracking-tighter">
                Petrol Integrity System
              </Text>
              <Text className="text-lg text-slate-400 leading-7">
                Sign in to access the dashboard
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(200).duration(600).springify()}
              className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-xl"
            >
              {/* Glassmorphism gradient overlay */}
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'transparent']}
                className="absolute inset-0"
              />
              <LoginForm />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(400).duration(600).springify()}
              className="mt-10 items-center"
            >
              <Text className="text-xs text-slate-500">
                © 2026 Petrol Integrity System. All rights reserved.
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
