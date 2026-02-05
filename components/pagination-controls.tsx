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
                className={`flex-row items-center px-4 py-2 rounded-lg ${canGoPrev && !loading ? 'bg-slate-700' : 'bg-slate-800 opacity-50'}`}
            >
                <Ionicons name="chevron-back" size={18} color={canGoPrev && !loading ? '#fff' : '#64748b'} />
                <Text className={`ml-1 font-medium ${canGoPrev && !loading ? 'text-white' : 'text-slate-500'}`}>
                    Previous
                </Text>
            </TouchableOpacity>

            <View className="flex-row items-center">
                {loading ? (
                    <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                    <Text className="text-slate-400 text-sm">
                        Page <Text className="text-white font-bold">{currentPage}</Text> of <Text className="text-white font-bold">{lastPage}</Text>
                    </Text>
                )}
            </View>

            <TouchableOpacity
                onPress={() => onPageChange(currentPage + 1)}
                disabled={!canGoNext || loading}
                className={`flex-row items-center px-4 py-2 rounded-lg ${canGoNext && !loading ? 'bg-slate-700' : 'bg-slate-800 opacity-50'}`}
            >
                <Text className={`mr-1 font-medium ${canGoNext && !loading ? 'text-white' : 'text-slate-500'}`}>
                    Next
                </Text>
                <Ionicons name="chevron-forward" size={18} color={canGoNext && !loading ? '#fff' : '#64748b'} />
            </TouchableOpacity>
        </View>
    );
});
