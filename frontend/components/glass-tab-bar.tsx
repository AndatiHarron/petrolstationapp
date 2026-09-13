import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/**
 * The floating glass bottom bar, with a notch cut out of its top edge.
 *
 * The bar detaches from the screen edge, rounds its corners and lets the page
 * scroll underneath it through a blur, with a wash of the brand navy so it
 * belongs to this app rather than looking like stock frosted chrome.
 *
 * The notch is a real hole, not a decoration painted on top: the glass is
 * rendered through a mask whose shape is an SVG outline with a semicircle
 * subtracted from the top edge, so the page shows through the notch exactly as
 * it does beside the bar. Faking it with an overlaid circle cannot work here —
 * the bar is translucent, so any disc laid over it reads as a lighter patch
 * rather than as an opening.
 */

// Sized to its contents: 9 + icon 20 + 2 + line 14 + 6 = 51, the rest slack.
const BAR_HEIGHT = 60;
const SIDE_INSET = 14;
const RADIUS = 22;

/** Icons, kept in step with the bar's height. */
export const TAB_ICON_SIZE = 20;

/** The gap between the top of the bar and the last row of a page. */
const BREATHING_ROOM = 20;

/** The semicircle taken out of the top edge, centred. */
const NOTCH_RADIUS = 21;

/**
 * How much room a scrolling screen must leave so its last row clears the bar.
 *
 * This has to be measured, not guessed. The bar floats *above* the safe-area
 * inset, so its top edge is that inset plus its own height off the bottom of
 * the screen — on a phone with three-button navigation that is around 116px,
 * where a flat constant of 94 left the last card tucked under the glass.
 */
export function useTabBarClearance(): number {
    const insets = useSafeAreaInsets();

    return Math.max(insets.bottom, 10) + BAR_HEIGHT + BREATHING_ROOM;
}

// The wash is what you actually see; too much of it and the bar is just a white
// rectangle with rounded corners. It is kept light enough that the page reads
// through it, and the blur — turned up to compensate — keeps the text on it
// legible against whatever scrolls past underneath.
const GLASS_WHITE = Platform.OS === 'ios' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.30)';
const BLUR_INTENSITY = Platform.OS === 'ios' ? 80 : 75;
const BRAND_TINGE = 'rgba(4,2,115,0.09)';
const EDGE_LIGHT = 'rgba(255,255,255,0.90)';
const EDGE_SHADE = 'rgba(4,2,115,0.18)';

/**
 * The bar's outline: a rounded rectangle whose top edge dips into a semicircle
 * at the centre.
 *
 * Travelling clockwise, so the outer corners take sweep-flag 1 while the notch
 * takes 0 — which, going left to right with y pointing down, is the direction
 * that curves the arc downward into the bar instead of bulging it out.
 */
function barOutline(width: number, height: number): string {
    const centre = width / 2;

    return [
        `M ${RADIUS},0`,
        `L ${centre - NOTCH_RADIUS},0`,
        `A ${NOTCH_RADIUS},${NOTCH_RADIUS} 0 0 0 ${centre + NOTCH_RADIUS},0`,
        `L ${width - RADIUS},0`,
        `A ${RADIUS},${RADIUS} 0 0 1 ${width},${RADIUS}`,
        `L ${width},${height - RADIUS}`,
        `A ${RADIUS},${RADIUS} 0 0 1 ${width - RADIUS},${height}`,
        `L ${RADIUS},${height}`,
        `A ${RADIUS},${RADIUS} 0 0 1 0,${height - RADIUS}`,
        `L 0,${RADIUS}`,
        `A ${RADIUS},${RADIUS} 0 0 1 ${RADIUS},0`,
        'Z',
    ].join(' ');
}

/** Just the top run and the notch, for the lit edge. */
function topEdge(width: number): string {
    const centre = width / 2;

    return [
        `M ${RADIUS},0`,
        `L ${centre - NOTCH_RADIUS},0`,
        `A ${NOTCH_RADIUS},${NOTCH_RADIUS} 0 0 0 ${centre + NOTCH_RADIUS},0`,
        `L ${width - RADIUS},0`,
    ].join(' ');
}

export function GlassTabBarBackground() {
    const { width } = useWindowDimensions();

    const barWidth = Math.max(width - SIDE_INSET * 2, 1);
    const outline = barOutline(barWidth, BAR_HEIGHT);
    const size = { width: barWidth, height: BAR_HEIGHT };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <MaskedView
                style={size}
                maskElement={
                    <Svg width={barWidth} height={BAR_HEIGHT}>
                        <Path d={outline} fill="#000000" />
                    </Svg>
                }
            >
                <BlurView
                    intensity={BLUR_INTENSITY}
                    tint="light"
                    experimentalBlurMethod="dimezisBlurView"
                    style={StyleSheet.absoluteFill}
                />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_WHITE }]} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_TINGE }]} />
            </MaskedView>

            {/* The edges, drawn over the masked glass: a navy hairline all the
                way round for definition, and a brighter run along the top and
                through the notch, the way glass catches light on its lip. */}
            <Svg width={barWidth} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
                <Path d={outline} fill="none" stroke={EDGE_SHADE} strokeWidth={1} />
                <Path d={topEdge(barWidth)} fill="none" stroke={EDGE_LIGHT} strokeWidth={1.5} />
            </Svg>
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
        // Asymmetric on purpose: the extra at the top is the notch's clearance.
        paddingTop: 9,
        paddingBottom: 6,
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
 * lineHeight is a comfortable 1.4× the font size. Set any tighter and Android
 * clips the line box, which is what cut the top off "Dashboard"; leave it out
 * altogether and the platform picks a box that is tight for the same reason.
 */
export const glassTabBarLabelStyle = {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600' as const,
    marginTop: 2,
    paddingHorizontal: 0,
};

export const glassTabBarItemStyle: ViewStyle = {
    paddingHorizontal: 2,
    paddingVertical: 0,
    // Centre the icon and label in whatever height the bar resolves to, rather
    // than letting them sit from the top and spill past its lower edge.
    justifyContent: 'center',
};
