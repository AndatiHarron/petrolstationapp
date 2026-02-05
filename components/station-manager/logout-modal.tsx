import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function LogoutModal({ visible, onClose, onConfirm }: LogoutModalProps) {
    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                className="flex-1 bg-black/60 justify-end relative"
            >
                {/* Backdrop Tap to Close using absolute positioning to cover screen behind modal */}
                <Pressable className="absolute inset-0" onPress={onClose} />

                <Animated.View
                    entering={SlideInDown.duration(250)}
                    exiting={SlideOutDown.duration(200)}
                    className="bg-slate-900 rounded-t-3xl border-t border-slate-700 p-8 pb-10"
                >
                    <View className="items-center mb-6">
                        <View className="bg-red-500/10 w-16 h-16 rounded-full items-center justify-center mb-4 border border-red-500/20">
                            <SymbolView name="power" size={32} tintColor="#ef4444" />
                        </View>
                        <Text className="text-white text-xl font-bold mb-2">Log Out?</Text>
                        <Text className="text-slate-400 text-center leading-6 text-base px-4">
                            Are you sure you want to end your session? You will be returned to the login screen.
                        </Text>
                    </View>

                    <View className="gap-3">
                        <TouchableOpacity
                            onPress={onConfirm}
                            className="w-full bg-red-600 py-4 rounded-2xl items-center shadow-lg shadow-red-900/20 active:bg-red-700"
                        >
                            <Text className="text-white font-bold text-lg">Log Out</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className="w-full bg-slate-800 py-4 rounded-2xl items-center border border-slate-700 active:bg-slate-700"
                        >
                            <Text className="text-slate-300 font-bold text-lg">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
