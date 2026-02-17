import React, { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import type { TutorialPlacement } from '@/lib/tutorial/types';

type Rect = { x: number; y: number; width: number; height: number };

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export type TutorialTooltipProps = {
    rect: Rect;
    placement: TutorialPlacement;
    title: string;
    description: string;
    stepIndex: number;
    stepsCount: number;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
};

export function TutorialTooltip({
    rect,
    placement,
    title,
    description,
    stepIndex,
    stepsCount,
    onNext,
    onBack,
    onSkip,
}: TutorialTooltipProps) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [cardHeight, setCardHeight] = useState<number>(0);

    const isFirst = stepIndex === 0;
    const isLast = stepIndex >= stepsCount - 1;
    const maxCardWidth = Math.min(360, screenWidth - 32);

    const position = useMemo(() => {
        const left = clamp(rect.x + rect.width / 2 - maxCardWidth / 2, 16, screenWidth - 16 - maxCardWidth);
        const topCandidate =
            placement === 'top'
                ? rect.y - 12 - cardHeight
                : placement === 'bottom'
                  ? rect.y + rect.height + 12
                  : rect.y + rect.height + 12;

        const top = clamp(topCandidate, 16, screenHeight - 16 - (cardHeight || 1));
        return { left, top, width: maxCardWidth };
    }, [cardHeight, maxCardWidth, placement, rect.height, rect.width, rect.x, rect.y, screenHeight, screenWidth]);

    return (
        <View
            style={{ position: 'absolute', left: position.left, top: position.top, width: position.width }}
            onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4"
        >
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Step {stepIndex + 1} of {stepsCount}
            </Text>
            <Text className="text-white text-lg font-bold mt-1">{title}</Text>
            <Text className="text-slate-300 text-sm mt-2">{description}</Text>

            <View className="flex-row items-center justify-between gap-2 mt-4">
                <Pressable
                    onPress={onSkip}
                    className="px-3 py-2 rounded-full border border-slate-600 active:opacity-80"
                >
                    <Text className="text-slate-200 font-bold text-xs uppercase tracking-wider">Skip</Text>
                </Pressable>

                <View className="flex-row items-center gap-2 flex-1 justify-end">
                    {!isFirst ? (
                        <Pressable
                            onPress={onBack}
                            className="px-3 py-2 rounded-full border border-slate-600 active:opacity-80"
                        >
                            <Text className="text-slate-200 font-bold text-xs uppercase tracking-wider">Back</Text>
                        </Pressable>
                    ) : null}
                    <Pressable
                        onPress={onNext}
                        className="px-4 py-2 rounded-full bg-emerald-500 active:opacity-80"
                    >
                        <Text className="text-white font-black text-xs uppercase tracking-wider">
                            {isLast ? 'Finish' : 'Next'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

