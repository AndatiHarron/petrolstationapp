import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LoginForm } from '../../components/login-form';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
          >
            <View className="flex-1 justify-end pb-12">
              <Animated.View
                entering={FadeInDown.duration(800).springify()}
                className="mb-12"
              >
                <Text className="text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                  PETROL
                </Text>
                <Text className="text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                  INTEGRITY
                </Text>
                <Text className="mt-4 text-lg font-medium text-slate-400 max-w-[280px] leading-6">
                  Secure access for station managers.
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(200).duration(800).springify()}
              >
                <LoginForm />

                <View className="mt-8 items-center">
                  <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    System v1.0.0
                  </Text>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
