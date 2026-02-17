import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTutorial } from '@/components/tutorial/use-tutorial';

type TutorialScrollAreaProps = {
    children: React.ReactNode;
    /**
     * Classname for the scroll view container.
     */
    scrollClassName?: string;
    /**
     * Classname for the content wrapper view (recommended place for padding like px-4).
     */
    contentClassName?: string;
} & Omit<React.ComponentProps<typeof Animated.ScrollView>, 'children' | 'className'>;

export function TutorialScrollArea({
    children,
    scrollClassName,
    contentClassName,
    ...scrollProps
}: TutorialScrollAreaProps) {
    const { registerScrollArea } = useTutorial();
    const scrollRef = useRef<any>(null);
    const contentRef = useRef<View>(null);

    useEffect(() => {
        return registerScrollArea(scrollRef, contentRef);
    }, [registerScrollArea]);

    return (
        <Animated.ScrollView ref={scrollRef} className={scrollClassName} {...scrollProps}>
            <View ref={contentRef} collapsable={false} className={contentClassName}>
                {children}
            </View>
        </Animated.ScrollView>
    );
}

