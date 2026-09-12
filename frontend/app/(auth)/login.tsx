import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
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
                {/* The wordmark replaces the "Petrol Integrity" text. It keeps
                    the file's own 2078x757 ratio and caps its width, so it
                    scales with the screen instead of being pinned to a size
                    that only suits one phone. accessibilityLabel carries the
                    name the text used to say. */}
                <Image
                  source={require('../../assets/logo.png')}
                  style={{ width: '100%', maxWidth: 260, aspectRatio: 2078 / 757 }}
                  contentFit="contain"
                  transition={200}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel="Petrol Integrity"
                />
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
