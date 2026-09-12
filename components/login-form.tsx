import { loginSchema } from '@/features/auth/schema';
import { useAuthStore } from '@/store/useAuthStore';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from './button';
import { InputField } from './input-field';
import { getErrorMessage } from '@/lib/utils';
import { usePostLogin } from '@/features/api/default/default';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '@/lib/api-error';
import { Ionicons } from '@expo/vector-icons';

export const LoginForm = () => {
  const { login: setAuth } = useAuthStore();
  const [isCompletingLogin, setIsCompletingLogin] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { mutate: login, isPending: isLoginPending } = usePostLogin({
    mutation: {
      onSuccess: async (data) => {
        // API returns { token: "..." } directly
        const response = data as unknown as { token?: string };
        if (response?.token) {
          // Keep UI in a "Signing in..." state while useProtectedRoute fetches roles + redirects.
          // This component will unmount on navigation, so no need to reset.
          setIsCompletingLogin(true);
          await setAuth(response.token);
        }
      },
      onError: (error) => {
        const message = getApiErrorMessage(error);
        console.log(error.message);
        toast.error('Login failed', {
          description: message,
        });
      }
    }
  });

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onDynamic: loginSchema
    },
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      login({
        data: {
          email: value.email,
          password: value.password,
        }
      });
    }
  });


  return (
    <View className="w-full gap-5">
      <form.Field name="email">
        {(field) => (
          <InputField
            label="Email Address"
            id={field.name}
            placeholder="Enter your email"
            value={field.state.value ?? ''}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={getErrorMessage(field.state.meta.errors, field.state.meta.isTouched, form.state.isSubmitted)}
            className="mb-0"
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <InputField
            label="Password"
            placeholder="Enter your password"
            id={field.name}
            value={field.state.value ?? ''}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={getErrorMessage(field.state.meta.errors, field.state.meta.isTouched, form.state.isSubmitted)}
            secureTextEntry={!isPasswordVisible}
            inputClassName="pr-12"
            rightAccessory={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                onPress={() => setIsPasswordVisible((v) => !v)}
                hitSlop={10}
              >
                <Ionicons
                  name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8b8b99"
                />
              </Pressable>
            }
            delay={200}
            className="mb-0"
          />
        )}
      </form.Field>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400).springify()}
        className="mt-1"
      >
        <Button
          className="rounded-lg"
          title={isCompletingLogin ? 'Signing in…' : 'Sign In'}
          onPress={() => form.handleSubmit()}
          loading={form.state.isSubmitting || isLoginPending || isCompletingLogin}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(400).springify()}
        className="items-center"
      >
        <Text className="text-sm font-medium text-ink-muted">
          Forgot your password? <Text className="font-semibold text-ink-muted">Get help</Text>
        </Text>
      </Animated.View>
    </View>
  );
};
