import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import type { TutorialRole, TutorialStep } from '@/lib/tutorial/types';
import { clearTutorialCompleted, getTutorialCompleted, setTutorialCompleted } from '@/lib/tutorial/tutorial-storage';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';

type TargetRef = RefObject<View>;

type TutorialContextValue = {
    role: TutorialRole;
    steps: TutorialStep[];
    step: TutorialStep | null;
    stepIndex: number;
    stepsCount: number;
    isActive: boolean;
    isReady: boolean;

    start: (opts?: { force?: boolean }) => Promise<void>;
    next: () => void;
    back: () => void;
    skip: () => void;
    finish: () => void;
    resetCompletion: () => Promise<void>;

    registerTarget: (id: string, ref: TargetRef) => () => void;
    getTargetRef: (id: string) => TargetRef | undefined;
};

export const TutorialContext = createContext<TutorialContextValue | null>(null);

type TutorialProviderProps = {
    role: TutorialRole;
    steps: TutorialStep[];
    children: React.ReactNode;
    autoStart?: boolean;
};

export function TutorialProvider({ role, steps, children, autoStart = true }: TutorialProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const targetsRef = useRef<Map<string, TargetRef>>(new Map());
    const [isActive, setIsActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [completed, setCompleted] = useState<boolean>(false);

    const step = steps[stepIndex] ?? null;

    useEffect(() => {
        let cancelled = false;
        setIsReady(false);
        getTutorialCompleted(role)
            .then((c) => {
                if (cancelled) return;
                setCompleted(c);
                setIsReady(true);
            })
            .catch(() => {
                if (cancelled) return;
                setCompleted(false);
                setIsReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, [role]);

    useEffect(() => {
        if (!autoStart) return;
        if (!isReady) return;
        if (completed) return;
        if (steps.length === 0) return;
        // Start once per mount when not completed
        setIsActive(true);
        setStepIndex(0);
    }, [autoStart, completed, isReady, steps.length]);

    useEffect(() => {
        if (!isActive) return;
        if (!step?.route) return;

        if (pathname !== step.route) {
            // Replace to avoid stacking a deep navigation history during onboarding
            try {
                router.replace(step.route as any);
            } catch {
                // ignore transient navigation errors (e.g. during transitions)
            }
        }
    }, [isActive, pathname, router, step?.route]);

    const start = useCallback(
        async (opts?: { force?: boolean }) => {
            if (steps.length === 0) return;
            if (completed && !opts?.force) return;
            setIsActive(true);
            setStepIndex(0);
            if (opts?.force) {
                await clearTutorialCompleted(role);
                setCompleted(false);
            }
        },
        [completed, role, steps.length]
    );

    const finish = useCallback(() => {
        setIsActive(false);
        setTutorialCompleted(role, true).catch(() => {});
        setCompleted(true);
    }, [role]);

    const skip = useCallback(() => {
        finish();
    }, [finish]);

    const next = useCallback(() => {
        if (stepIndex >= steps.length - 1) {
            finish();
            return;
        }
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, [finish, stepIndex, steps.length]);

    const back = useCallback(() => {
        setStepIndex((i) => Math.max(0, i - 1));
    }, []);

    const resetCompletion = useCallback(async () => {
        await clearTutorialCompleted(role);
        setCompleted(false);
    }, [role]);

    const registerTarget = useCallback((id: string, ref: TargetRef) => {
        targetsRef.current.set(id, ref);
        return () => {
            const current = targetsRef.current.get(id);
            if (current === ref) {
                targetsRef.current.delete(id);
            }
        };
    }, []);

    const getTargetRef = useCallback((id: string) => {
        return targetsRef.current.get(id);
    }, []);

    const value = useMemo<TutorialContextValue>(
        () => ({
            role,
            steps,
            step,
            stepIndex,
            stepsCount: steps.length,
            isActive,
            isReady,
            start,
            next,
            back,
            skip,
            finish,
            resetCompletion,
            registerTarget,
            getTargetRef,
        }),
        [
            finish,
            getTargetRef,
            isActive,
            isReady,
            back,
            next,
            registerTarget,
            resetCompletion,
            role,
            skip,
            start,
            step,
            stepIndex,
            steps,
        ]
    );

    return (
        <TutorialContext.Provider value={value}>
            {children}
            <TutorialOverlay />
        </TutorialContext.Provider>
    );
}

