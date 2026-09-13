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

                <View className="rounded-t-3xl border-t border-surface-border bg-surface px-5 pb-8 pt-6">
                    <View className="mb-5 items-center">
                        <View
                            style={{ width: 44, height: 44, borderRadius: 15 }}
                            className="mb-3 items-center justify-center bg-accent-subtle"
                        >
                            <Power size={20} color="#bf0a30" />
                        </View>
                        <Text className="text-ink text-[17px] font-bold">Log out?</Text>
                        <Text className="text-ink-muted mt-1 text-center text-[12.5px] leading-[18px]">
                            You will be returned to the login screen.
                        </Text>
                    </View>

                    <View className="gap-2.5">
                        <TouchableOpacity
                            onPress={onConfirm}
                            accessibilityRole="button"
                            accessibilityLabel="Confirm log out"
                            activeOpacity={0.8}
                            className="h-12 w-full items-center justify-center rounded-xl bg-accent"
                        >
                            <Text className="text-sm font-bold uppercase tracking-wider text-white">
                                Log out
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            accessibilityRole="button"
                            activeOpacity={0.8}
                            className="h-12 w-full items-center justify-center rounded-xl border border-surface-border bg-surface-sunken"
                        >
                            <Text className="text-ink text-sm font-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
