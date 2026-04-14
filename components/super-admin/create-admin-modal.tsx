import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, ChevronDown } from 'lucide-react-native';
import { useOrganizationsIndex } from '@/features/api/organization/organization';
import { useStoreUser } from '@/features/api/user/store-user';
import type { OrganizationResource, OrganizationsIndex200 } from '@/features/api/model';

interface CreateAdminModalProps {
    visible: boolean;
    onClose: () => void;
}

export function CreateAdminModal({ visible, onClose }: CreateAdminModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [showOrgPicker, setShowOrgPicker] = useState(false);

    const { data: orgsResponse } = useOrganizationsIndex();
    const organizations: OrganizationResource[] =
        (orgsResponse as OrganizationsIndex200 | undefined)?.data ?? [];

    const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

    useEffect(() => {
        if (visible) {
            setName('');
            setEmail('');
            setPassword('');
            setSelectedOrgId(null);
            setShowOrgPicker(false);
        }
    }, [visible]);

    const storeMutation = useStoreUser({
        onSuccess: () => {
            onClose();
        },
        onError: (err: unknown) => {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : null;
            Alert.alert('Error', msg ?? 'Failed to create admin. Please try again.');
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Name is required.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Validation Error', 'Email is required.');
            return;
        }
        if (!password || password.length < 8) {
            Alert.alert('Validation Error', 'Password must be at least 8 characters.');
            return;
        }
        if (!selectedOrgId) {
            Alert.alert('Validation Error', 'Please select an organization.');
            return;
        }
        storeMutation.mutate({
            name: name.trim(),
            email: email.trim(),
            password,
            role: 'admin',
            organization_id: selectedOrgId,
        });
    }, [name, email, password, selectedOrgId, storeMutation]);

    const isPending = storeMutation.isPending;

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} className="flex-1">
                <KeyboardAvoidingView
                    behavior="padding"
                    enabled={Platform.OS === 'ios'}
                    className="flex-1 justify-end"
                    keyboardVerticalOffset={0}
                >
                    <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700 h-[90%] flex overflow-hidden">
                            <View className="items-center pt-2 pb-4">
                                <View className="w-12 h-1 bg-slate-700 rounded-full" />
                            </View>

                            <View className="px-6 pb-6 flex-row items-center justify-between border-b border-slate-800">
                                <View>
                                    <Text className="text-white text-2xl font-bold">
                                        New Admin
                                    </Text>
                                    <Text className="text-slate-400 text-sm">
                                        Create an admin and assign to an organization
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={onClose}
                                    className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center"
                                >
                                    <X size={16} color="#94a3b8" />
                                </Pressable>
                            </View>

                            <ScrollView
                                className="flex-1 px-6 pt-6"
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 24 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                    Name *
                                </Text>
                                <TextInput
                                    className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 mb-4"
                                    placeholder="e.g. Jane Doe"
                                    placeholderTextColor="#475569"
                                    value={name}
                                    onChangeText={setName}
                                    autoFocus
                                    autoCapitalize="words"
                                />

                                <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                    Email *
                                </Text>
                                <TextInput
                                    className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 mb-4"
                                    placeholder="e.g. jane@example.com"
                                    placeholderTextColor="#475569"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                    Password * (min 8 characters)
                                </Text>
                                <TextInput
                                    className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 mb-4"
                                    placeholder="Enter password"
                                    placeholderTextColor="#475569"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                <Text className="text-slate-400 text-xs font-bold uppercase mb-2 ml-1">
                                    Organization *
                                </Text>
                                <Pressable
                                    onPress={() => setShowOrgPicker(!showOrgPicker)}
                                    className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-2 flex-row justify-between items-center"
                                >
                                    <Text
                                        className={
                                            selectedOrg ? 'text-white' : 'text-slate-500'
                                        }
                                    >
                                        {selectedOrg?.name ?? 'Select an organization'}
                                    </Text>
                                    <ChevronDown size={20} color="#64748b" />
                                </Pressable>
                                {showOrgPicker ? (
                                    <View className="bg-slate-800 rounded-xl border border-slate-700 mb-4 max-h-40">
                                        <ScrollView nestedScrollEnabled>
                                            {organizations.length === 0 ? (
                                                <View className="p-4">
                                                    <Text className="text-slate-500 text-sm">
                                                        No organizations yet. Create one first.
                                                    </Text>
                                                </View>
                                            ) : (
                                                organizations.map((org) => (
                                                    <Pressable
                                                        key={org.id}
                                                        onPress={() => {
                                                            setSelectedOrgId(org.id);
                                                            setShowOrgPicker(false);
                                                        }}
                                                        className={`p-3 border-b border-slate-700 ${
                                                            selectedOrgId === org.id
                                                                ? 'bg-orange-600/20'
                                                                : ''
                                                        }`}
                                                    >
                                                        <Text
                                                            className={
                                                                selectedOrgId === org.id
                                                                    ? 'text-orange-400'
                                                                    : 'text-white'
                                                            }
                                                        >
                                                            {org.name}
                                                        </Text>
                                                    </Pressable>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                ) : (
                                    <View className="mb-2" />
                                )}
                            </ScrollView>

                            <View className="p-6 border-t border-slate-800 bg-slate-900 pb-10">
                                <Pressable
                                    className={`rounded-xl py-4 items-center ${
                                        isPending ? 'bg-orange-600/50' : 'bg-orange-600'
                                    }`}
                                    onPress={handleSubmit}
                                    disabled={isPending || organizations.length === 0}
                                >
                                    <Text className="text-white font-bold text-lg">
                                        {isPending
                                            ? 'Creating...'
                                            : 'Create Admin'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
