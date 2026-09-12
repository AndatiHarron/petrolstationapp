import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Power } from 'lucide-react-native';

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function LogoutModal({ visible, onClose, onConfirm }: LogoutModalProps) {
    if (!visible) return null;

    return (
        <Modal
            transparent
            visible
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/*
              The backdrop is a flex sibling occupying only the space ABOVE the sheet,
              not an `absolute inset-0` overlay stretched across it. An absolute
              backdrop sits on top of the buttons, and Reanimated entering animations
              inside a native Modal leave touch targets offset from where they are
              painted on Android. Between them, taps on "Log Out" were landing on the
              backdrop rather than the button. No absolute overlay and no layout
              animation here, so the hit areas match what is drawn.
            */}
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                <View className="bg-surface rounded-t-3xl border-t border-surface-border p-8 pb-10">
                    <View className="items-center mb-6">
                        <View className="bg-accent-subtle w-16 h-16 rounded-full items-center justify-center mb-4">
                            <Power size={32} color="#bf0a30" />
                        </View>
                        <Text className="text-ink text-xl font-bold mb-2">Log Out?</Text>
                        <Text className="text-ink-muted text-center leading-6 text-base px-4">
                            Are you sure you want to end your session? You will be returned to the login screen.
                        </Text>
                    </View>

                    <View className="gap-3">
                        <TouchableOpacity
                            onPress={onConfirm}
                            accessibilityRole="button"
                            accessibilityLabel="Confirm log out"
                            activeOpacity={0.8}
                            className="w-full bg-accent py-4 rounded-2xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Log Out</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            accessibilityRole="button"
                            activeOpacity={0.8}
                            className="w-full bg-surface-sunken py-4 rounded-2xl items-center border border-surface-border"
                        >
                            <Text className="text-ink font-bold text-lg">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
