import type { TutorialStep } from '@/lib/tutorial/types';

export const MANAGER_TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'manager_shift_section',
        route: '/station-manager',
        targetId: 'manager-shift-section',
        title: 'Shift Management',
        description: 'Start and lock shifts to control what can be recorded during operations.',
        placement: 'bottom',
    },
    {
        id: 'manager_customers_tab',
        route: '/station-manager',
        targetId: 'manager-tab-customers',
        title: 'Customers',
        description: 'Manage customers and track credit sales.',
        placement: 'top',
        spotlightPadding: 4,
        spotlightRadius: 8,
    },
    {
        id: 'manager_liftings_tab',
        route: '/station-manager',
        targetId: 'manager-tab-liftings',
        title: 'Liftings',
        description: 'Record new liftings and review supplier deliveries.',
        placement: 'top',
        spotlightPadding: 4,
        spotlightRadius: 8,
    },
    {
        id: 'manager_shifts_tab',
        route: '/station-manager',
        targetId: 'manager-tab-shifts',
        title: 'Shifts',
        description: 'View current and historical shift summaries.',
        placement: 'top',
        spotlightPadding: 4,
        spotlightRadius: 8,
    },
    {
        id: 'manager_activity_feed',
        route: '/station-manager',
        targetId: 'manager-activity-feed',
        title: 'Activity Feed',
        description: 'See the most recent transactions and events as they happen.',
        placement: 'top',
    },
];

