import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { View, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a', // slate-900
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerRight: () => {
            const { logout } = useAuthStore();
            const router = useRouter();

            const handleLogout = async () => {
              await logout();
              router.replace('/(auth)/login');
            };

            return (
              <View className="flex-row items-center gap-4">
                <TouchableOpacity>
                  <Ionicons name="notifications" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )
          },
        }}
      />
    </Stack>
  );
}
