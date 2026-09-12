import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
    Banknote,
    Building2,
    Camera,
    Circle,
    CircleCheck,
    CirclePlay,
    CircleStop,
    Clock,
    Droplet,
    Fuel,
    Gauge,
    Lock,
    Play,
    Plus,
    Power,
    RotateCw,
    Ruler,
    Trash2,
    TriangleAlert,
    Users,
    X,
} from 'lucide-react-native';

/**
 * Runtime icon resolver.
 *
 * The app was written against `expo-symbols`, whose SF Symbols render on iOS only —
 * on Android every one of them was invisible. Call sites that pass a *dynamic* icon
 * name go through here so the SF-style names already stored in data and props keep
 * working while rendering real cross-platform glyphs.
 */
const REGISTRY: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    'arrow.clockwise': RotateCw,
    'banknote.fill': Banknote,
    'building.2.fill': Building2,
    'camera.fill': Camera,
    'clock.badge.checkmark.fill': CircleCheck,
    'clock.fill': Clock,
    'drop.fill': Droplet,
    'exclamationmark.triangle.fill': TriangleAlert,
    'fuelpump.fill': Fuel,
    'gauge.with.needle': Gauge,
    'lock.fill': Lock,
    'person.2.fill': Users,
    'play.circle.fill': CirclePlay,
    'play.fill': Play,
    'stop.circle.fill': CircleStop,
    'ruler.fill': Ruler,
    plus: Plus,
    power: Power,
    trash: Trash2,
    xmark: X,
};

interface AppIconProps {
    name: string;
    size?: number;
    color?: string;
    /** Call sites converted from SymbolView pass spacing through style. */
    style?: StyleProp<ViewStyle>;
}

export function AppIcon({ name, size = 20, color = '#5c5c6b', style }: AppIconProps) {
    const Glyph = REGISTRY[name] ?? Circle;

    if (style) {
        return (
            <View style={style}>
                <Glyph size={size} color={color} />
            </View>
        );
    }

    return <Glyph size={size} color={color} />;
}
