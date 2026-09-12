import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LoginForm } from '../../components/login-form';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    // A tinted ground with the form on white: the card needs something to sit
    // against, and white-on-white gave it no edge at all.
    <View className="flex-1 bg-surface-sunken">
      <StatusBar style="dark" backgroundColor="#f7f7fa" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior="padding"
          enabled={Platform.OS === 'ios'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 28,
            }}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center gap-7">
              <Animated.View
                entering={FadeInDown.duration(650).springify()}
                className="items-center gap-3"
              >
                {/* The wordmark, at the file's own 2078x757 ratio and capped
                    rather than pinned to fixed pixels, so it scales with the
                    screen. accessibilityLabel carries the name the text said. */}
                <Image
                  source={require('../../assets/logo.png')}
                  style={{ width: '100%', maxWidth: 230, aspectRatio: 2078 / 757 }}
                  contentFit="contain"
                  transition={200}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel="Petrol Integrity"
                />

                <Text className="text-ink-faint max-w-[260px] text-center text-[11px] leading-4">
                  Shift integrity, inventory and station operations in one place.
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(150).duration(650).springify()}
                className="rounded-2xl border border-surface-border bg-surface p-5"
                style={{
                  shadowColor: '#12121a',
                  shadowOpacity: 0.05,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View className="mb-5 gap-1">
                  <Text className="text-ink text-xl font-bold">Sign in</Text>
                  <Text className="text-ink-muted text-xs">
                    Use the account issued for your station.
                  </Text>
                </View>

                <LoginForm />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(300).duration(650).springify()}
                className="items-center gap-1"
              >
                {/* A credit, not a headline: small, at the foot of the page. */}
                <Text className="text-[11px] font-semibold" style={{ color: '#bf0a30' }}>
                  Powered by Ginto Energies
                </Text>
                <Text className="text-ink-faint text-[10px]">System v1.0.0</Text>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
