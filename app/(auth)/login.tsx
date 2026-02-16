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
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center gap-10">
              <Animated.View entering={FadeInDown.duration(650).springify()} className="gap-4">
                <View className="gap-0">
                  <Text className="text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                    PETROL
                  </Text>
                  <Text className="text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                    INTEGRITY
                  </Text>
                </View>
                <Text className="max-w-[320px] text-base font-medium text-slate-400 leading-6">
                  Shift integrity, inventory, and station operations in one place.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150).duration(650).springify()} className="gap-8">
                <LoginForm />

                <View className="items-center">
                  <Text className="text-xs text-slate-500">System v1.0.0</Text>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
