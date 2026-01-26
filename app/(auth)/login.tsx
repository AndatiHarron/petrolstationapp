import React from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LoginForm } from '../../components/login-form';

export default function LoginScreen() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.contentContainer}>
          <Animated.View 
            entering={FadeInDown.duration(600).springify()}
            style={styles.header}
          >
            <Text style={styles.title}>
              Petrol Integrity System
            </Text>
            <Text style={styles.subtitle}>
              Sign in to access the dashboard
            </Text>
          </Animated.View>
          
          <Animated.View 
            entering={FadeInDown.delay(200).duration(600).springify()}
            style={styles.card}
          >
            <LoginForm />
          </Animated.View>
          
          <Animated.View 
            entering={FadeInDown.delay(400).duration(600).springify()}
            style={styles.footer}
          >
            <Text style={styles.copyright}>
              © 2026 Petrol Integrity System. All rights reserved.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF', // White
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8', // Slate 400
    lineHeight: 28,
  },
  card: {
    backgroundColor: '#1e293b', // Slate 800
    borderRadius: 24,
    padding: 32,
    borderCurve: 'continuous',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#334155', // Slate 700
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 13,
    color: '#64748b', // Slate 500
  },
});
