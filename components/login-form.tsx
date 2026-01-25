import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
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
    <View className="w-full">
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
      />
      <View className="mt-6">
        <Button title="Sign In" onPress={handleLogin} loading={loading} />
      </View>
      <View className="mt-4 items-center">
        <Text className="text-sm text-slate-500">
          Forgot your password? <Text className="font-bold text-blue-600">Reset here</Text>
        </Text>
      </View>
    </View>
  );
};
