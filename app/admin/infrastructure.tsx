import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StatusBar, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Package, Cylinder, Truck, Gauge, ChevronDown, ChevronUp } from 'lucide-react-native';
import { StationsList } from '@/components/admin/infrastructure/stations-list';
import { ProductsList } from '@/components/admin/infrastructure/products-list';
import { TanksList } from '@/components/admin/infrastructure/tanks-list';
import { NozzlesList } from '@/components/admin/infrastructure/nozzles-list';
import { SuppliersList } from '@/components/admin/infrastructure/suppliers-list';
import { StationModal } from '@/components/admin/infrastructure/station-modal';
import { ProductModal } from '@/components/admin/infrastructure/product-modal';
import { TankModal } from '@/components/admin/infrastructure/tank-modal';
import { NozzleModal } from '@/components/admin/infrastructure/nozzle-modal';
import { SupplierModal } from '@/components/admin/infrastructure/supplier-modal';
import { useStationsDestroy, getStationsIndexQueryKey } from '@/features/api/station/station';
import { useProductsDestroy, getProductsIndexQueryKey } from '@/features/api/product/product';
import { useTanksDestroy, getTanksIndexQueryKey } from '@/features/api/tank/tank';
import { useNozzlesDestroy, getNozzlesIndexQueryKey } from '@/features/api/nozzle/nozzle';
import { useCreditorsDestroy, getCreditorsIndexQueryKey } from '@/features/api/creditor/creditor';
import type { StationResource, ProductResource, TankResource, NozzleResource, SupplierResource } from '@/features/api/model';

type TabType = 'stations' | 'products' | 'tanks' | 'nozzles' | 'suppliers';

const TABS: { id: TabType; label: string; icon: typeof Building2 }[] = [
    { id: 'stations', label: 'Stations', icon: Building2 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'tanks', label: 'Tanks', icon: Cylinder },
    { id: 'nozzles', label: 'Nozzles', icon: Gauge },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
];

function SectionDropdown({
    activeTab,
    onSelect,
    isOpen,
    onToggle
}: {
    activeTab: TabType;
    onSelect: (tab: TabType) => void;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const activeTabConfig = TABS.find((t) => t.id === activeTab) ?? TABS[0];
    const Icon = activeTabConfig.icon;

    return (
        <View className="mx-4 mb-4">
            <Pressable
                onPress={onToggle}
                className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-row items-center justify-between"
            >
                <View className="flex-row items-center">
                    <Icon size={20} color="#94a3b8" />
                    <Text className="text-white font-medium text-base ml-2">{activeTabConfig.label}</Text>
                </View>
                {isOpen ? (
                    <ChevronUp size={20} color="#64748b" />
                ) : (
                    <ChevronDown size={20} color="#64748b" />
                )}
            </Pressable>
            {isOpen ? (
                <View className="bg-slate-800 rounded-xl border border-slate-700 mt-1 max-h-56 overflow-hidden">
                    <ScrollView nestedScrollEnabled>
                        {TABS.map((tab) => {
                            const TabIcon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <Pressable
                                    key={tab.id}
                                    onPress={() => {
                                        onSelect(tab.id);
                                        onToggle();
                                    }}
                                    className={`p-4 flex-row items-center border-b border-slate-700 last:border-b-0 ${isSelected ? 'bg-blue-600/20' : ''}`}
                                >
                                    <TabIcon size={18} color={isSelected ? '#3b82f6' : '#94a3b8'} />
                                    <Text className={`ml-3 font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

export default function InfrastructureTab() {
    const params = useLocalSearchParams<{ tab?: TabType }>();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>(params.tab ?? 'stations');
    const [showSectionPicker, setShowSectionPicker] = useState(false);

    // Modal states
    const [stationModalVisible, setStationModalVisible] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);
    const [tankModalVisible, setTankModalVisible] = useState(false);
    const [nozzleModalVisible, setNozzleModalVisible] = useState(false);
    const [editingStation, setEditingStation] = useState<StationResource | undefined>(undefined);
    const [editingProduct, setEditingProduct] = useState<ProductResource | undefined>(undefined);
    const [editingTank, setEditingTank] = useState<TankResource | undefined>(undefined);
    const [editingNozzle, setEditingNozzle] = useState<NozzleResource | undefined>(undefined);
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

    const nozzleDeleteMutation = useNozzlesDestroy({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getNozzlesIndexQueryKey() });
            },
            onError: () => {
                Alert.alert('Error', 'Failed to delete nozzle.');
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

    const handleToggleSectionPicker = useCallback(() => {
        setShowSectionPicker((prev) => !prev);
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

    // Nozzle handlers
    const handleAddNozzle = useCallback(() => {
        setEditingNozzle(undefined);
        setNozzleModalVisible(true);
    }, []);

    const handleEditNozzle = useCallback((nozzle: NozzleResource) => {
        setEditingNozzle(nozzle);
        setNozzleModalVisible(true);
    }, []);

    const handleDeleteNozzle = useCallback((id: string) => {
        Alert.alert(
            'Delete Nozzle',
            'Are you sure you want to delete this nozzle? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => nozzleDeleteMutation.mutate({ nozzle: id }),
                },
            ]
        );
    }, [nozzleDeleteMutation]);

    const handleCloseNozzleModal = useCallback(() => {
        setNozzleModalVisible(false);
        setEditingNozzle(undefined);
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
            case 'nozzles':
                return (
                    <NozzlesList
                        onAddNozzle={handleAddNozzle}
                        onEditNozzle={handleEditNozzle}
                        onDeleteNozzle={handleDeleteNozzle}
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
                        Manage stations, products, tanks, nozzles, and suppliers
                    </Text>
                </View>

                {/* Section Dropdown */}
                <SectionDropdown
                    activeTab={activeTab}
                    onSelect={handleTabChange}
                    isOpen={showSectionPicker}
                    onToggle={handleToggleSectionPicker}
                />

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
            <NozzleModal
                visible={nozzleModalVisible}
                onClose={handleCloseNozzleModal}
                nozzle={editingNozzle}
            />
            <SupplierModal
                visible={supplierModalVisible}
                onClose={handleCloseSupplierModal}
                supplier={editingSupplier}
            />
        </View>
    );
}
