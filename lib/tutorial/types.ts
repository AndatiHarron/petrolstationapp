export type TutorialRole = 'admin' | 'manager';

export type TutorialPlacement = 'top' | 'bottom' | 'left' | 'right';

export type TutorialStep = {
    id: string;
    targetId: string;
    title: string;
    description: string;
    placement?: TutorialPlacement;
    /**
     * Optional route to navigate to before measuring/spotlighting the target.
     * Example: '/admin' or '/station-manager'
     */
    route?: string;
    /**
     * Optional horizontal offset for the spotlight (positive = right).
     */
    offsetX?: number;
    /**
     * Optional vertical offset for the spotlight (positive = lower).
     */
    offsetY?: number;
    /**
     * Optional extra padding around the spotlight target (in px).
     * Smaller values are useful for tab bar items.
     */
    spotlightPadding?: number;
    /**
     * Optional border radius for the spotlight outline (in px).
     * Smaller values look more "square".
     */
    spotlightRadius?: number;
};

