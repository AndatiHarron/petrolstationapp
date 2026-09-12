import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { useOrganizationsStore, getOrganizationsIndexQueryKey } from '@/features/api/organization/organization';

interface CreateOrganizationModalProps {
    visible: boolean;
    onClose: () => void;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function CreateOrganizationModal({ visible, onClose }: CreateOrganizationModalProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    useEffect(() => {
        if (visible) {
            setName('');
            setSlug('');
            setSlugManuallyEdited(false);
        }
    }, [visible]);

    useEffect(() => {
        if (!slugManuallyEdited && name) {
            setSlug(slugify(name));
        }
    }, [name, slugManuallyEdited]);

    const storeMutation = useOrganizationsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getOrganizationsIndexQueryKey() });
                onClose();
            },
            onError: () => {
                Alert.alert('Error', 'Failed to create organization. Please try again.');
            },
        },
    });

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Organization name is required.');
            return;
        }
        if (!slug.trim()) {
            Alert.alert('Validation Error', 'Slug is required.');
            return;
        }
        storeMutation.mutate({
            data: {
                name: name.trim(),
                slug: slug.trim(),
            },
        });
    }, [name, slug, storeMutation]);

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
                    <View className="bg-surface-sunken rounded-t-3xl border-t border-surface-border h-[85%] flex overflow-hidden">
                        <View className="items-center pt-2 pb-4">
                            <View className="w-12 h-1 bg-surface-border rounded-full" />
                        </View>

                        <View className="px-6 pb-6 flex-row items-center justify-between border-b border-surface-border">
                            <View>
                                <Text className="text-ink text-2xl font-bold">
                                    New Organization
                                </Text>
                                <Text className="text-ink-muted text-sm">
                                    Add a new tenant organization
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                className="w-10 h-10 rounded-full bg-surface items-center justify-center"
                            >
                                <X size={16} color="#8b8b99" />
                            </Pressable>
                        </View>

                        <ScrollView
                            className="flex-1 px-6 pt-6"
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Organization Name *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-orange-500 mb-4"
                                placeholder="e.g. Octane Fuels Ltd"
                                placeholderTextColor="#5c5c6b"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            <Text className="text-ink-muted text-xs font-bold uppercase mb-2 ml-1">
                                Slug *
                            </Text>
                            <TextInput
                                className="bg-surface text-ink p-4 rounded-xl border border-surface-border focus:border-orange-500 mb-4"
                                placeholder="e.g. octane-fuels-ltd"
                                placeholderTextColor="#5c5c6b"
                                value={slug}
                                onChangeText={(t) => {
                                    setSlug(t);
                                    setSlugManuallyEdited(true);
                                }}
                            />
                        </ScrollView>

                        <View className="p-6 border-t border-surface-border bg-surface-sunken pb-10">
                            <Pressable
                                className={`rounded-xl py-4 items-center ${isPending ? 'bg-orange-600/50' : 'bg-orange-600'}`}
                                onPress={handleSubmit}
                                disabled={isPending}
                            >
                                <Text className="text-ink font-bold text-lg">
                                    {isPending ? 'Creating...' : 'Create Organization'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}
