import { loginSchema } from '@/features/auth/schema';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from './button';
import { InputField } from './input-field';
import { getErrorMessage } from '@/lib/utils';
import { usePostLogin } from '@/features/api/default/default';

export const LoginForm = () => {
  const router = useRouter();
  const { mutate: login, isPending: isLoginPending } = usePostLogin({
    mutation: {
      onSuccess: (data) => {
        console.log(data);
        router.replace('/(app)/dashboard');
      },
      onError: (error) => {
        console.error("error", error.message);
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
    <View style={styles.container}>
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
        style={styles.buttonContainer}
      >
        <Button title="Sign In" onPress={() => form.handleSubmit()} loading={form.state.isSubmitting || isLoginPending} />
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
