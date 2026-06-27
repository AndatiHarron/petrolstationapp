import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LoginForm } from '../../components/login-form';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior="padding"
          enabled={Platform.OS === 'ios'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center gap-10">
              <Animated.View entering={FadeInDown.duration(650).springify()} className="gap-4 pt-12 items-center">
                <View className="gap-0 items-center">
                  <Text className="text-6xl font-black text-black tracking-tighter uppercase leading-[0.9] text-center">
                    PETROL
                  </Text>
                  <Text className="text-6xl font-black text-black tracking-tighter uppercase leading-[0.9] text-center">
                    INTEGRITY
                  </Text>
                </View>
                <Text className="max-w-[320px] text-base font-medium text-gray-600 leading-6">
                  Shift integrity, inventory, and station operations in one place.
                </Text>
                <Text className="max-w-[320px] text-sm font-semibold leading-5" style={{ color: '#bf0a30' }}>
                  Powered by Ginto Energies.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150).duration(650).springify()} className="gap-8">
                <LoginForm />

                <View className="items-center">
                  <Text className="text-xs text-gray-600">System v1.0.0</Text>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
