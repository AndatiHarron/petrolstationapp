import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useTanksIndex } from '../../features/api/tank/tank';
import { useProductsIndex } from '../../features/api/product/product';
import { useAuditLogIndex } from '../../features/api/audit-log/audit-log';
import { useStationsIndex } from '../../features/api/station/station';

// Card component for consistent styling
function StatCard({ title, value, subtitle, icon, trendUp }: {
    title: string;
    value: string;
    subtitle?: string;
    icon?: React.ReactNode;
    trendUp?: boolean;
}) {
    return (
        <View className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{title}</Text>
            <Text className="text-2xl font-bold text-white">{value}</Text>
            {subtitle && <Text className="text-slate-500 text-xs mt-1">{subtitle}</Text>}
        </View>
    );
}

// Tank Level Visualization
function TankVisualization({ tank }: { tank: { id: string; name: string; current_level: number; capacity: number; product?: { name: string } } }) {
    const level = tank.current_level / tank.capacity;
    const height = Math.max(20, level * 120);
    const color = level > 0.3 ? 'bg-blue-500' : 'bg-red-500';

    return (
        <View className="items-center gap-2 mx-2">
            <View className="items-center justify-end">
                <Text className="text-white font-bold text-xs mb-1">
                    {Math.round(level * 100)}%
                </Text>
                <View className="w-12 rounded-t-lg bg-slate-700/30 overflow-hidden relative h-[120px] justify-end border border-slate-600">
                    <View style={{ height }} className={`w-full ${color} opacity-80`} />
                </View>
            </View>
            <Text className="text-slate-400 text-[10px] font-semibold text-center w-16" numberOfLines={1}>
                {tank.name}
            </Text>
            {tank.product && (
                <Text className="text-slate-500 text-[9px]">{tank.product.name}</Text>
            )}
        </View>
    );
}

export default function AdminDashboard() {
    // Fetch data using API hooks
    const tanksQuery = useTanksIndex();
    const productsQuery = useProductsIndex();
    const auditLogsQuery = useAuditLogIndex();
    const stationsQuery = useStationsIndex();

    const isLoading = tanksQuery.isLoading || productsQuery.isLoading || auditLogsQuery.isLoading;

    // Extract data safely
    const tanks = tanksQuery.data?.status === 200 ? tanksQuery.data.data.data : [];
    const products = productsQuery.data?.status === 200 ? productsQuery.data.data.data : [];
    const auditLogs = auditLogsQuery.data?.status === 200 ? auditLogsQuery.data.data.data : [];
    const stations = stationsQuery.data?.status === 200 ? stationsQuery.data.data.data : [];

    // Calculate metrics
    const totalTanks = tanks.length;
    const totalProducts = products.length;
    const totalStations = stations.length;
    const recentActivities = auditLogs.slice(0, 5);

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="mb-6 mt-4">
                        <Text className="text-2xl font-bold text-white">Business Intelligence</Text>
                        <Text className="text-slate-500 text-sm mt-1">Financial oversight and operational integrity</Text>
                    </View>

                    {isLoading ? (
                        <View className="flex-1 items-center justify-center py-20">
                            <ActivityIndicator size="large" color="#10b981" />
                            <Text className="text-slate-400 mt-4">Loading dashboard data...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Quick Stats Row */}
                            <View className="flex-row gap-3 mb-6">
                                <StatCard title="Stations" value={String(totalStations)} subtitle="Active" />
                                <StatCard title="Products" value={String(totalProducts)} subtitle="Types" />
                                <StatCard title="Tanks" value={String(totalTanks)} subtitle="Total" />
                            </View>

                            {/* Wet Stock Section */}
                            <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
                                <View className="mb-4">
                                    <Text className="text-white font-bold text-lg">Wet Stock Levels</Text>
                                    <Text className="text-slate-500 text-xs">Current Tank Readings</Text>
                                </View>

                                {tanks.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View className="flex-row items-end py-2">
                                            {tanks.map((tank: any) => (
                                                <TankVisualization key={tank.id} tank={tank} />
                                            ))}
                                        </View>
                                    </ScrollView>
                                ) : (
                                    <View className="items-center py-8">
                                        <Text className="text-slate-500">No tank data available</Text>
                                    </View>
                                )}
                            </View>

                            {/* Products Overview */}
                            <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
                                <View className="mb-4">
                                    <Text className="text-white font-bold text-lg">Product Prices</Text>
                                    <Text className="text-slate-500 text-xs">Current pricing</Text>
                                </View>

                                {products.length > 0 ? (
                                    <View className="gap-2">
                                        {products.slice(0, 5).map((product: any) => (
                                            <View key={product.id} className="flex-row justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                                <Text className="text-slate-300 font-medium">{product.name}</Text>
                                                <Text className="text-emerald-400 font-bold">
                                                    KES {Number(product.selling_price).toLocaleString()}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View className="items-center py-8">
                                        <Text className="text-slate-500">No products available</Text>
                                    </View>
                                )}
                            </View>

                            {/* Recent Activity */}
                            <View className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mb-6">
                                <View className="mb-4">
                                    <Text className="text-white font-bold text-lg">Recent Activity</Text>
                                    <Text className="text-slate-500 text-xs">Audit trail</Text>
                                </View>

                                {recentActivities.length > 0 ? (
                                    <View className="gap-2">
                                        {recentActivities.map((log: any) => (
                                            <View key={log.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                                <Text className="text-slate-300 text-sm font-medium">{log.description}</Text>
                                                <View className="flex-row items-center mt-1 gap-2">
                                                    <Text className="text-slate-500 text-xs">
                                                        {log.causer?.name || 'System'}
                                                    </Text>
                                                    <View className="w-1 h-1 rounded-full bg-slate-600" />
                                                    <Text className="text-slate-500 text-xs">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View className="items-center py-8">
                                        <Text className="text-slate-500">No recent activity</Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
