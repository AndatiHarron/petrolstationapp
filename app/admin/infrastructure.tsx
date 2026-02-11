import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Package, Cylinder, Truck } from 'lucide-react-native';
import { StationsList } from '@/components/admin/infrastructure/stations-list';
import { ProductsList } from '@/components/admin/infrastructure/products-list';
import { TanksList } from '@/components/admin/infrastructure/tanks-list';
import { SuppliersList } from '@/components/admin/infrastructure/suppliers-list';
import { StationModal } from '@/components/admin/infrastructure/station-modal';
import { ProductModal } from '@/components/admin/infrastructure/product-modal';
import { TankModal } from '@/components/admin/infrastructure/tank-modal';
import { SupplierModal } from '@/components/admin/infrastructure/supplier-modal';
import { useStationsDestroy, getStationsIndexQueryKey } from '@/features/api/station/station';
import { useProductsDestroy, getProductsIndexQueryKey } from '@/features/api/product/product';
import { useTanksDestroy, getTanksIndexQueryKey } from '@/features/api/tank/tank';
import { useCreditorsDestroy, getCreditorsIndexQueryKey } from '@/features/api/creditor/creditor';
import type { StationResource, ProductResource, TankResource, SupplierResource } from '@/features/api/model';

type TabType = 'stations' | 'products' | 'tanks' | 'suppliers';

const TABS: { id: TabType; label: string; icon: typeof Building2 }[] = [
    { id: 'stations', label: 'Stations', icon: Building2 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'tanks', label: 'Tanks', icon: Cylinder },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
];

function TabButton({
    tab,
    isActive,
    onPress
}: {
    tab: typeof TABS[number];
    isActive: boolean;
    onPress: () => void;
}) {
    const Icon = tab.icon;
    return (
        <Pressable
            onPress={onPress}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${isActive ? 'bg-slate-700' : ''
                }`}
        >
            <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} />
            <Text className={`ml-2 font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {tab.label}
            </Text>
        </Pressable>
    );
}

export default function InfrastructureTab() {
    const params = useLocalSearchParams<{ tab?: TabType }>();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>(params.tab ?? 'stations');

    // Modal states
    const [stationModalVisible, setStationModalVisible] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);
    const [tankModalVisible, setTankModalVisible] = useState(false);
    const [editingStation, setEditingStation] = useState<StationResource | undefined>(undefined);
    const [editingProduct, setEditingProduct] = useState<ProductResource | undefined>(undefined);
    const [editingTank, setEditingTank] = useState<TankResource | undefined>(undefined);
    const [supplierModalVisible, setSupplierModalVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierResource | undefined>(undefined);

    // Delete mutations
    const stationDeleteMutation = useStationsDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getStationsIndexQueryKey() });
            },
            onError: () => {
                Alert.alert('Error', 'Failed to delete station.');
            },
        },
    });

    const productDeleteMutation = useProductsDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getProductsIndexQueryKey() });
            },
            onError: () => {
                Alert.alert('Error', 'Failed to delete product.');
            },
        },
    });

    const tankDeleteMutation = useTanksDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
            },
            onError: () => {
                Alert.alert('Error', 'Failed to delete tank.');
            },
        },
    });

    const supplierDeleteMutation = useCreditorsDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getCreditorsIndexQueryKey() });
            },
            onError: () => {
                Alert.alert('Error', 'Failed to delete supplier.');
            },
        },
    });

    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
    }, []);

    // Station handlers
    const handleAddStation = useCallback(() => {
        setEditingStation(undefined);
        setStationModalVisible(true);
    }, []);

    const handleEditStation = useCallback((station: StationResource) => {
        setEditingStation(station);
        setStationModalVisible(true);
    }, []);

    const handleDeleteStation = useCallback((id: string) => {
        Alert.alert(
            'Delete Station',
            'Are you sure you want to delete this station? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => stationDeleteMutation.mutate({ station: id }),
                },
            ]
        );
    }, [stationDeleteMutation]);

    const handleCloseStationModal = useCallback(() => {
        setStationModalVisible(false);
        setEditingStation(undefined);
    }, []);

    // Product handlers
    const handleAddProduct = useCallback(() => {
        setEditingProduct(undefined);
        setProductModalVisible(true);
    }, []);

    const handleEditProduct = useCallback((product: ProductResource) => {
        setEditingProduct(product);
        setProductModalVisible(true);
    }, []);

    const handleDeleteProduct = useCallback((id: string) => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => productDeleteMutation.mutate({ product: id }),
                },
            ]
        );
    }, [productDeleteMutation]);

    const handleCloseProductModal = useCallback(() => {
        setProductModalVisible(false);
        setEditingProduct(undefined);
    }, []);

    // Tank handlers
    const handleAddTank = useCallback(() => {
        setEditingTank(undefined);
        setTankModalVisible(true);
    }, []);

    const handleEditTank = useCallback((tank: TankResource) => {
        setEditingTank(tank);
        setTankModalVisible(true);
    }, []);

    const handleDeleteTank = useCallback((id: string) => {
        Alert.alert(
            'Delete Tank',
            'Are you sure you want to delete this tank? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => tankDeleteMutation.mutate({ tank: id }),
                },
            ]
        );
    }, [tankDeleteMutation]);

    const handleCloseTankModal = useCallback(() => {
        setTankModalVisible(false);
        setEditingTank(undefined);
    }, []);

    // Supplier handlers
    const handleAddSupplier = useCallback(() => {
        setEditingSupplier(undefined);
        setSupplierModalVisible(true);
    }, []);

    const handleEditSupplier = useCallback((supplier: SupplierResource) => {
        setEditingSupplier(supplier);
        setSupplierModalVisible(true);
    }, []);

    const handleDeleteSupplier = useCallback((id: string) => {
        Alert.alert(
            'Delete Supplier',
            'Are you sure you want to delete this supplier? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => supplierDeleteMutation.mutate({ creditor: id }),
                },
            ]
        );
    }, [supplierDeleteMutation]);

    const handleCloseSupplierModal = useCallback(() => {
        setSupplierModalVisible(false);
        setEditingSupplier(undefined);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'stations':
                return (
                    <StationsList
                        onAddStation={handleAddStation}
                        onEditStation={handleEditStation}
                        onDeleteStation={handleDeleteStation}
                    />
                );
            case 'products':
                return (
                    <ProductsList
                        onAddProduct={handleAddProduct}
                        onEditProduct={handleEditProduct}
                        onDeleteProduct={handleDeleteProduct}
                    />
                );
            case 'tanks':
                return (
                    <TanksList
                        onAddTank={handleAddTank}
                        onEditTank={handleEditTank}
                        onDeleteTank={handleDeleteTank}
                    />
                );
            case 'suppliers':
                return (
                    <SuppliersList
                        onAddSupplier={handleAddSupplier}
                        onEditSupplier={handleEditSupplier}
                        onDeleteSupplier={handleDeleteSupplier}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View className="flex-1 bg-slate-900">
            <StatusBar barStyle="light-content" />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-4 mb-4 mt-4">
                    <Text className="text-2xl font-bold text-white">Infrastructure</Text>
                    <Text className="text-slate-500 text-sm mt-1">
                        Manage stations, products, tanks, and suppliers
                    </Text>
                </View>

                {/* Tab Bar */}
                <View className="mx-4 mb-4 p-1 bg-slate-800 rounded-xl flex-row">
                    {TABS.map((tab) => (
                        <TabButton
                            key={tab.id}
                            tab={tab}
                            isActive={activeTab === tab.id}
                            onPress={() => handleTabChange(tab.id)}
                        />
                    ))}
                </View>

                {/* Content */}
                <View className="flex-1 px-4">
                    {renderContent()}
                </View>
            </SafeAreaView>

            {/* Modals */}
            <StationModal
                visible={stationModalVisible}
                onClose={handleCloseStationModal}
                station={editingStation}
            />
            <ProductModal
                visible={productModalVisible}
                onClose={handleCloseProductModal}
                product={editingProduct}
            />
            <TankModal
                visible={tankModalVisible}
                onClose={handleCloseTankModal}
                tank={editingTank}
            />
            <SupplierModal
                visible={supplierModalVisible}
                onClose={handleCloseSupplierModal}
                supplier={editingSupplier}
            />
        </View>
    );
}
