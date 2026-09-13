import React from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import type { EdgeInsets } from 'react-native-safe-area-context';

/**
 * The floating glass bottom bar.
 *
 * The bar detaches from the screen edge, rounds its corners and lets the page
 * scroll underneath it through a blur, with a wash of the brand navy so it
 * belongs to this app rather than looking like stock frosted chrome.
 *
 * Layer order matters. The blur must sit at the bottom of the stack so it has
 * the page behind it to sample; a solid fallback underneath would leave it
 * blurring nothing but its own backing. The tints go on top of the blur.
 */

const BAR_HEIGHT = 68;
const SIDE_INSET = 14;
const RADIUS = 26;

/** How much room a scrolling screen must leave so its last row clears the bar. */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + 26;

// The wash is what you actually see; too much of it and the bar is just a white
// rectangle with rounded corners. It is kept light enough that the page reads
// through it, and the blur — turned up to compensate — keeps the text on it
// legible against whatever scrolls past underneath.
const GLASS_WHITE = Platform.OS === 'ios' ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.52)';
const BLUR_INTENSITY = Platform.OS === 'ios' ? 60 : 55;
const BRAND_TINGE = 'rgba(4,2,115,0.07)';
const EDGE_LIGHT = 'rgba(255,255,255,0.80)';
const EDGE_SHADE = 'rgba(4,2,115,0.12)';

export function GlassTabBarBackground() {
    return (
        <View style={[StyleSheet.absoluteFill, { borderRadius: RADIUS, overflow: 'hidden' }]}>
            <BlurView
                intensity={BLUR_INTENSITY}
                tint="light"
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_WHITE }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_TINGE }]} />

            {/* A lit top edge and a navy hairline border — what reads as glass
                is mostly the edges, not the fill. */}
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: RADIUS,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: EDGE_SHADE,
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: RADIUS * 0.6,
                    right: RADIUS * 0.6,
                    height: 1,
                    backgroundColor: EDGE_LIGHT,
                }}
            />
        </View>
    );
}

/**
 * The tab bar's own style. Transparent, because GlassTabBarBackground paints it;
 * the radius stays here as well so the pressable area matches what is drawn.
 */
export function glassTabBarStyle(insets: EdgeInsets): ViewStyle {
    return {
        position: 'absolute',
        left: SIDE_INSET,
        right: SIDE_INSET,
        bottom: Math.max(insets.bottom, 10),
        height: BAR_HEIGHT,
        paddingTop: 9,
        paddingBottom: 9,
        borderRadius: RADIUS,
        borderTopWidth: 0,
        backgroundColor: 'transparent',
        // A cast shadow is what makes it read as floating rather than inlaid.
        // Android draws its elevation shadow from the view's bounds, which on a
        // transparent view comes out as a hard rectangle behind the rounded
        // glass, so it gets none.
        ...Platform.select({
            ios: {
                shadowColor: '#04026e',
                shadowOpacity: 0.16,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
            },
            default: { elevation: 0 },
        }),
    };
}

/**
 * Labels.
 *
 * An explicit lineHeight, because without one the descender on a "Dashboard"
 * was clipped at the bottom of its line box. The size drops to 10 so the
 * longest label — Offloading, across four tabs on a narrow phone — fits whole
 * rather than ending in an ellipsis, and the item padding goes so each label
 * gets the full width of its tab.
 */
export const glassTabBarLabelStyle = {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600' as const,
    marginTop: 3,
    paddingHorizontal: 0,
};

export const glassTabBarItemStyle: ViewStyle = {
    paddingHorizontal: 2,
    paddingVertical: 0,
};
