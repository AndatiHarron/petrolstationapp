import { Stack } from 'expo-router';
import { TopBar } from '@/components/top-bar';

export default function SuperAdminLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options }) => <TopBar title={options.title ?? 'Organizations'} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Organizations' }} />
    </Stack>
  );
}
