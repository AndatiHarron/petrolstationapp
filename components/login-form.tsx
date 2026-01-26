import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { InputField } from './input-field';
import { Button } from './button';
import { getEmailError, getPasswordError } from '../utils/validation';

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError || undefined,
        password: passwordError || undefined,
      });
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.replace('/(main)');
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <InputField
        label="Email Address"
        placeholder="Enter your email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.email) setErrors({ ...errors, email: undefined });
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        delay={100}
      />
      <InputField
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors({ ...errors, password: undefined });
        }}
        error={errors.password}
        secureTextEntry
        delay={200}
      />
      
      <Animated.View 
        entering={FadeInDown.delay(300).duration(400).springify()}
        style={styles.buttonContainer}
      >
        <Button title="Sign In" onPress={handleLogin} loading={loading} />
      </Animated.View>

      <Animated.View 
        entering={FadeInDown.delay(400).duration(400).springify()}
        style={styles.footer}
      >
        <Text style={styles.footerText}>
          Forgot your password? <Text style={styles.linkText}>Reset here</Text>
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonContainer: {
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8', // Slate 400
  },
  linkText: {
    fontWeight: '700',
    color: '#f59e0b', // Amber 500
  },
});
