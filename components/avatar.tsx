import React from 'react';
import { View, Text } from 'react-native';

/** Initials from a display name: "Andati Harron" -> "AH", "Admin" -> "A". */
export function initialsFor(name?: string | null): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
    name?: string | null;
    size?: number;
    /** Inverted: white ground with navy initials, for use on a navy surface. */
    inverted?: boolean;
}

/**
 * A circular initials avatar, standing in for a profile picture. The app stores
 * no user images, so initials are the honest placeholder rather than a generic
 * silhouette that implies one could be set.
 */
export function Avatar({ name, size = 34, inverted = false }: AvatarProps) {
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: inverted ? '#ffffff' : '#040273',
            }}
            className="items-center justify-center"
        >
            <Text
                style={{ fontSize: Math.round(size * 0.38) }}
                className={`font-bold ${inverted ? 'text-brand' : 'text-white'}`}
            >
                {initialsFor(name)}
            </Text>
        </View>
    );
}
