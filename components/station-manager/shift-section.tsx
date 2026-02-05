import React, { memo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useShiftIndex } from '@/features/api/shift/shift';
import type { ShiftIndex200, AuthenticationExceptionResponse } from '@/features/api/model';
import { StartShiftView } from './start-shift-view';
import { StationManagerHeader } from './header';
import { SkeletonCard } from './skeleton-card';

// Type guard for successful API response
function hasData<T extends { data: unknown }>(
    response: T | AuthenticationExceptionResponse | undefined
): response is T {
    return response !== undefined && 'data' in response;
}

interface ShiftSectionProps {
    onShiftChange?: (isActive: boolean) => void;
}

export const ShiftSection = memo(function ShiftSection({ onShiftChange }: ShiftSectionProps) {
    const { data: activeShift, isLoading } = useShiftIndex({
        query: {
            queryKey: ['activeShift'],
        },
    });

    // Extract shift data using type guard
    const shiftResource = React.useMemo(() => {
        const res = activeShift as unknown as ShiftIndex200 | AuthenticationExceptionResponse | undefined;
        return hasData<ShiftIndex200>(res) ? res.data : undefined;
    }, [activeShift]);

    // Notify parent of shift status changes
    React.useEffect(() => {
        onShiftChange?.(!!shiftResource);
    }, [shiftResource, onShiftChange]);

    return (
        <Animated.View entering={FadeIn.duration(500).delay(100)}>
            <StationManagerHeader isShiftActive={!!shiftResource} />
            {isLoading ? (
                <SkeletonCard variant="shift" />
            ) : (
                <StartShiftView activeShift={shiftResource} />
            )}
        </Animated.View>
    );
});
