import { Stack } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';

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
          headerRight: () => (
            <View className="flex-row items-center gap-4">
              <TouchableOpacity>
                <SymbolView 
                  name="bell.fill" 
                  size={20} 
                  tintColor="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity>
                <SymbolView 
                  name="person.circle.fill" 
                  size={24} 
                  tintColor="#fff" 
                />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
    </Stack>
  );
}
