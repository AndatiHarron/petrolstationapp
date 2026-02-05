import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Droplets, Clock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function StationManagerLayout() {
    return (
        <>
            <StatusBar style="light" backgroundColor="#0f172a" />
            <Tabs
                screenOptions={{
                    tabBarStyle: {
                        backgroundColor: '#0f172a',
                        borderTopColor: '#1e293b',
                    },
                    tabBarActiveTintColor: '#10b981',
                    tabBarInactiveTintColor: '#64748b',
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="customers"
                    options={{
                        title: 'Customers',
                        tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="liftings"
                    options={{
                        title: 'Liftings',
                        tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="shifts"
                    options={{
                        title: 'Shifts',
                        tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}
