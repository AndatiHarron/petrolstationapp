import { Stack } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoutButton } from '@/components/logout-button';

/**
 * Real component, not an inline callback: hooks were previously called inside
 * `headerRight`, which is not a component and breaks the rules of hooks.
 */
function HeaderActions() {
  return (
    <View className="flex-row items-center gap-3">
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={8}>
        <Bell size={22} color="#040273" />
      </TouchableOpacity>
      <LogoutButton compact />
    </View>
  );
}

export default function MainLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#000000',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Dashboard',
            headerRight: () => <HeaderActions />,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
