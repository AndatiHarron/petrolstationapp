import { loginSchema } from '@/features/auth/schema';
import { useAuthStore } from '@/store/useAuthStore';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from './button';
import { InputField } from './input-field';
import { getErrorMessage } from '@/lib/utils';
import { usePostLogin } from '@/features/api/default/default';
import { toast } from 'sonner-native';
import { getApiErrorMessage } from '@/lib/api-error';

export const LoginForm = () => {
  const router = useRouter();
  const { login: setAuth } = useAuthStore();
  const { mutate: login, isPending: isLoginPending } = usePostLogin({
    mutation: {
      onSuccess: async (data) => {
        // API returns { token: "..." } directly
        const response = data as unknown as { token?: string };
        if (response?.token) {
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
    <View className="w-full">
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
            secureTextEntry
            delay={200}
          />
        )}
      </form.Field>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400).springify()}
        className="mt-2"
      >
        <Button className='rounded-lg' title="Sign In" onPress={() => form.handleSubmit()} loading={form.state.isSubmitting || isLoginPending} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(400).springify()}
        className="mt-8 items-center"
      >
        <Text className="text-sm font-medium text-slate-500">
          Forgot your password? <Text className="font-bold text-white underline">Get help</Text>
        </Text>
      </Animated.View>
    </View>
  );
};
