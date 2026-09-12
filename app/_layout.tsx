import { Stack, Slot } from 'expo-router';
import '../global.css';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { View, ActivityIndicator, Alert, LogBox } from 'react-native';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/error-boundary';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors (e.g. reloading in development)
});

// ──────────────────────────────────────────────
// DIAGNOSTIC: Global error catchers
// These fire BEFORE the app closes, giving us the error message.
// Remove once the crash is identified and fixed.
// ──────────────────────────────────────────────

// 1. Catch unhandled JS exceptions
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('🔴 GLOBAL ERROR:', isFatal ? '(FATAL)' : '', error?.message, error?.stack);
  try {
    Alert.alert(
      isFatal ? '💥 Fatal JS Error' : '⚠️ JS Error',
      `${error?.message}\n\n${error?.stack?.slice(0, 500)}`,
    );
  } catch (_) {}
  originalHandler?.(error, isFatal);
});

// 2. Catch unhandled promise rejections
const onUnhandledRejection = (event: any) => {
  console.error('🔴 UNHANDLED PROMISE REJECTION:', event?.reason);
  try {
    const msg = event?.reason?.message || String(event?.reason);
    Alert.alert('💥 Unhandled Promise Rejection', msg);
  } catch (_) {}
};

if (typeof globalThis !== 'undefined') {
  // @ts-ignore – available in Hermes
  globalThis.addEventListener?.('unhandledrejection', onUnhandledRejection);
}

function InitialLayout() {
  const { checkSession, isLoading, token } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  useProtectedRoute();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors (e.g. already hidden)
      });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    // Auth routing is declarative on purpose. Imperatively calling router.replace()
    // on logout was unreliable — it worked on the first sign-out and then failed on
    // every later one, because the authenticated routes stayed mounted in the
    // navigator. Gating the screens on the token means signing out removes them
    // outright, so there is no stale route left to be stranded on.
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!token}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="station-manager" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="super-admin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary label="Root">
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <InitialLayout />
            <Toaster />
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

