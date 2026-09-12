import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import { SuperAdminHeader } from '../../components/super-admin/super-admin-header';
import { StatsRibbon } from '../../components/super-admin/stats-ribbon';
import { TenantTable } from '../../components/super-admin/tenant-table';
import { AdminsList } from '../../components/super-admin/admins-list';
import { CreateOrganizationModal } from '../../components/super-admin/create-organization-modal';
import { CreateAdminModal } from '../../components/super-admin/create-admin-modal';
import { MOCK_METRICS } from '../../components/super-admin/mock-data';

export default function SuperAdminDashboard() {
    const [createOrgModalVisible, setCreateOrgModalVisible] = useState(false);
    const [createAdminModalVisible, setCreateAdminModalVisible] = useState(false);

    const handleAddOrganization = useCallback(() => {
        setCreateOrgModalVisible(true);
    }, []);

    const handleCloseCreateOrgModal = useCallback(() => {
        setCreateOrgModalVisible(false);
    }, []);

    const handleAddAdmin = useCallback(() => {
        setCreateAdminModalVisible(true);
    }, []);

    const handleCloseCreateAdminModal = useCallback(() => {
        setCreateAdminModalVisible(false);
    }, []);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <SafeAreaView className="flex-1" edges={['left', 'right']}>
                <Animated.ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6 mt-4">
                        <SuperAdminHeader />
                    </View>

                    {/* <StatsRibbon metrics={MOCK_METRICS} /> */}

                    <View className="mt-6 flex-1">
                        <TenantTable onAddOrganization={handleAddOrganization} />
                    </View>

                    <AdminsList onAddAdmin={handleAddAdmin} />
                </Animated.ScrollView>
            </SafeAreaView>

            <CreateOrganizationModal
                visible={createOrgModalVisible}
                onClose={handleCloseCreateOrgModal}
            />
            <CreateAdminModal
                visible={createAdminModalVisible}
                onClose={handleCloseCreateAdminModal}
            />
        </View>
    );
}
