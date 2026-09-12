import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaginationControlsProps {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
    hasPrev?: boolean;
    hasNext?: boolean;
}

export const PaginationControls = memo(function PaginationControls({
    currentPage,
    lastPage,
    onPageChange,
    loading = false,
    hasPrev,
    hasNext,
}: PaginationControlsProps) {
    const canGoPrev = hasPrev ?? currentPage > 1;
    const canGoNext = hasNext ?? currentPage < lastPage;

    if (lastPage <= 1) return null;

    return (
        <View className="flex-row items-center justify-between py-4 px-2">
            <TouchableOpacity
                onPress={() => onPageChange(currentPage - 1)}
                disabled={!canGoPrev || loading}
                className={`flex-row items-center px-4 py-2 rounded-lg ${canGoPrev && !loading ? 'bg-surface-border' : 'bg-surface opacity-50'}`}
            >
                <Ionicons name="chevron-back" size={18} color={canGoPrev && !loading ? '#fff' : '#5c5c6b'} />
                <Text className={`ml-1 font-medium ${canGoPrev && !loading ? 'text-ink' : 'text-ink-muted'}`}>
                    Previous
                </Text>
            </TouchableOpacity>

            <View className="flex-row items-center">
                {loading ? (
                    <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                    <Text className="text-ink-muted text-sm">
                        Page <Text className="text-ink font-bold">{currentPage}</Text> of <Text className="text-ink font-bold">{lastPage}</Text>
                    </Text>
                )}
            </View>

            <TouchableOpacity
                onPress={() => onPageChange(currentPage + 1)}
                disabled={!canGoNext || loading}
                className={`flex-row items-center px-4 py-2 rounded-lg ${canGoNext && !loading ? 'bg-surface-border' : 'bg-surface opacity-50'}`}
            >
                <Text className={`mr-1 font-medium ${canGoNext && !loading ? 'text-ink' : 'text-ink-muted'}`}>
                    Next
                </Text>
                <Ionicons name="chevron-forward" size={18} color={canGoNext && !loading ? '#fff' : '#5c5c6b'} />
            </TouchableOpacity>
        </View>
    );
});
