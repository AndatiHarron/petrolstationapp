import { Tabs } from 'expo-router';
import { LayoutDashboard, Banknote, Settings, Package, Building2, ClipboardList } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function AdminLayout() {
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
                    name="finance"
                    options={{
                        title: 'Finance',
                        tabBarIcon: ({ color, size }) => <Banknote size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="requests"
                    options={{
                        title: 'Requests',
                        tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="system"
                    options={{
                        title: 'System',
                        tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="inventory"
                    options={{
                        title: 'Inventory',
                        tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="infrastructure"
                    options={{
                        title: 'Infrastructure',
                        tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}

