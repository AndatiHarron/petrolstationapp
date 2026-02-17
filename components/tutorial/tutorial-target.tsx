import React, { useEffect, useRef } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { useTutorial } from '@/components/tutorial/use-tutorial';

type TutorialTargetProps = ViewProps & {
    id: string;
    children: React.ReactNode;
};

export function TutorialTarget({ id, children, ...props }: TutorialTargetProps) {
    const { registerTarget } = useTutorial();
    const ref = useRef<View>(null);

    useEffect(() => {
        return registerTarget(id, ref);
    }, [id, registerTarget]);

    return (
        <View ref={ref} collapsable={false} {...props}>
            {children}
        </View>
    );
}

