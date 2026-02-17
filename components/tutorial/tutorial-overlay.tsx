import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, View, useWindowDimensions, findNodeHandle } from 'react-native';

import { useTutorial } from '@/components/tutorial/use-tutorial';
import { TutorialTooltip } from '@/components/tutorial/tutorial-tooltip';
import type { TutorialPlacement } from '@/lib/tutorial/types';

type Rect = { x: number; y: number; width: number; height: number };

const DEFAULT_PLACEMENT: TutorialPlacement = 'bottom';

function safeRect(rect: Rect, screen: { width: number; height: number }): Rect {
    // Basic clamp so we never render negative sizes/positions
    const x = Math.max(0, rect.x);
    const y = Math.max(0, rect.y);
    const width = Math.max(0, Math.min(rect.width, screen.width));
    const height = Math.max(0, Math.min(rect.height, screen.height));
    return { x, y, width, height };
}

export function TutorialOverlay() {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const { isActive, step, stepIndex, stepsCount, getTargetRef, getScrollArea, next, back, skip } = useTutorial();

    const [rect, setRect] = useState<Rect | null>(null);
    const [autoScrollTick, setAutoScrollTick] = useState(0);
    const lastAutoScrollRef = useRef<{ stepId: string; at: number } | null>(null);

    useEffect(() => {
        if (!isActive || !step) {
            setRect(null);
            return;
        }

        const targetRef = getTargetRef(step.targetId);
        let cancelled = false;

        const measureNow = () => {
            if (cancelled) return;
            const node = targetRef?.current;
            if (!node || typeof node.measureInWindow !== 'function') {
                setRect(null);
                return;
            }
            node.measureInWindow((x, y, width, height) => {
                if (cancelled) return;
                if (!width || !height) {
                    setRect(null);
                    return;
                }
                setRect({ x, y, width, height });
            });
        };

        const run = InteractionManager.runAfterInteractions(() => {
            // Allow layout to settle after navigation / animations
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    measureNow();
                });
            });
        });

        // Keep the spotlight aligned while content settles (e.g. lists/images/data loading)
        const t1 = setTimeout(measureNow, 120);
        const t2 = setTimeout(measureNow, 400);
        const interval = setInterval(measureNow, 250);

        return () => {
            cancelled = true;
            run.cancel();
            clearTimeout(t1);
            clearTimeout(t2);
            clearInterval(interval);
        };
    }, [getTargetRef, isActive, step, step?.targetId]);

    // Auto-scroll if the current step target is off-screen (e.g. below the fold)
    useEffect(() => {
        if (!isActive || !step || !rect) return;

        const offscreenTop = rect.y < 0;
        const offscreenBottom = rect.y + rect.height > screenHeight;
        if (!offscreenTop && !offscreenBottom) return;

        // Avoid spamming scroll commands (especially while measuring repeatedly).
        const now = Date.now();
        if (lastAutoScrollRef.current?.stepId === step.id && now - lastAutoScrollRef.current.at < 600) {
            return;
        }

        const scrollArea = getScrollArea();
        if (!scrollArea) return;

        const targetRef = getTargetRef(step.targetId);
        const node = targetRef?.current;
        const contentNode = scrollArea.contentRef.current;
        const scroller = scrollArea.scrollRef.current;
        if (!node || !contentNode) return;
        if (typeof node.measureLayout !== 'function') return;

        // Prevent repeated scrolling for the same step unless the target is still offscreen.
        const onMeasure = (_x: number, y: number) => {
            const offsetY = step.offsetY ?? 0;
            const targetY = Math.max(0, y + offsetY - 80);
            if (typeof scroller?.scrollTo === 'function') {
                lastAutoScrollRef.current = { stepId: step.id, at: now };
                scroller.scrollTo({ y: targetY, animated: true });
                // trigger a re-measure cycle after scroll begins
                setAutoScrollTick((t) => t + 1);
            }
        };

        const onFail = () => {
            // ignore measure errors
        };

        // Fabric/new architecture can be picky here; prefer passing the native component ref
        // and fall back to a node handle if needed.
        try {
            node.measureLayout(contentNode as any, onMeasure, onFail);
        } catch {
            const relativeTo = findNodeHandle(contentNode);
            if (!relativeTo) return;
            try {
                node.measureLayout(relativeTo as any, onMeasure, onFail);
            } catch {
                // ignore
            }
        }
    }, [getScrollArea, getTargetRef, isActive, rect, screenHeight, step]);

    const hole = useMemo(() => {
        if (!rect) return null;
        const padding = step?.spotlightPadding ?? 10;
        const offsetX = step?.offsetX ?? 0;
        const offsetY = step?.offsetY ?? 0;
        const r = safeRect(
            { ...rect, x: rect.x + offsetX, y: rect.y + offsetY },
            { width: screenWidth, height: screenHeight }
        );
        return {
            x: Math.max(0, r.x - padding),
            y: Math.max(0, r.y - padding),
            width: Math.min(screenWidth, r.width + padding * 2),
            height: Math.min(screenHeight, r.height + padding * 2),
            radius: step?.spotlightRadius ?? 16,
        };
    }, [
        rect,
        screenHeight,
        screenWidth,
        autoScrollTick,
        step?.offsetX,
        step?.offsetY,
        step?.spotlightPadding,
        step?.spotlightRadius,
    ]);

    if (!isActive || !step || !hole) return null;

    const placement = step.placement ?? DEFAULT_PLACEMENT;

    const topH = hole.y;
    const bottomY = hole.y + hole.height;
    const bottomH = Math.max(0, screenHeight - bottomY);
    const leftW = hole.x;
    const rightX = hole.x + hole.width;
    const rightW = Math.max(0, screenWidth - rightX);

    return (
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
            {/* 4 overlay rectangles (leave a hole for touch-through) */}
            <View
                pointerEvents="auto"
                style={{ position: 'absolute', left: 0, top: 0, width: screenWidth, height: topH, backgroundColor: 'rgba(0,0,0,0.65)' }}
            />
            <View
                pointerEvents="auto"
                style={{ position: 'absolute', left: 0, top: bottomY, width: screenWidth, height: bottomH, backgroundColor: 'rgba(0,0,0,0.65)' }}
            />
            <View
                pointerEvents="auto"
                style={{ position: 'absolute', left: 0, top: hole.y, width: leftW, height: hole.height, backgroundColor: 'rgba(0,0,0,0.65)' }}
            />
            <View
                pointerEvents="auto"
                style={{ position: 'absolute', left: rightX, top: hole.y, width: rightW, height: hole.height, backgroundColor: 'rgba(0,0,0,0.65)' }}
            />

            {/* Highlight border */}
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    left: hole.x,
                    top: hole.y,
                    width: hole.width,
                    height: hole.height,
                    borderRadius: hole.radius,
                    borderWidth: 2,
                    borderColor: 'rgba(16,185,129,0.9)',
                }}
            />

            <TutorialTooltip
                rect={hole}
                placement={placement}
                title={step.title}
                description={step.description}
                stepIndex={stepIndex}
                stepsCount={stepsCount}
                onNext={next}
                onBack={back}
                onSkip={skip}
            />
        </View>
    );
}

