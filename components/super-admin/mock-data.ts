export type Tenant = {
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    status: 'active' | 'suspended' | 'pending';
    onboardedAt: string;
    stationsCount: number;
    revenue: string;
};

export type SystemMetric = {
    label: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: string;
};

export type Alert = {
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    viewed: boolean;
};

export const MOCK_TENANTS: Tenant[] = [
    {
        id: '1',
        name: 'Octane Fuels Ltd',
        ownerName: 'Sarah Johnson',
        ownerEmail: 'sarah@octanefuels.com',
        status: 'active',
        onboardedAt: '2025-01-15',
        stationsCount: 12,
        revenue: '$145,200',
    },
    {
        id: '2',
        name: 'Metro Petroleum',
        ownerName: 'David Chen',
        ownerEmail: 'david@metropetro.co',
        status: 'active',
        onboardedAt: '2025-02-01',
        stationsCount: 5,
        revenue: '$82,000',
    },
    {
        id: '3',
        name: 'Horizon Energy',
        ownerName: 'James Wilson',
        ownerEmail: 'j.wilson@horizon.net',
        status: 'suspended',
        onboardedAt: '2024-11-20',
        stationsCount: 3,
        revenue: '$0',
    },
    {
        id: '4',
        name: 'Apex Stations',
        ownerName: 'Emily Davis',
        ownerEmail: 'emily@apex.com',
        status: 'active',
        onboardedAt: '2025-03-10',
        stationsCount: 8,
        revenue: '$95,500',
    },
    {
        id: '5',
        name: 'Global Gas',
        ownerName: 'Michael Brown',
        ownerEmail: 'm.brown@globalgas.com',
        status: 'pending',
        onboardedAt: '2025-03-28',
        stationsCount: 0,
        revenue: '$0',
    },
];

export const MOCK_METRICS: SystemMetric[] = [
    {
        label: 'Total Active Stations',
        value: '1,245',
        change: '+12%',
        trend: 'up',
        icon: 'Fuel',
    },
    {
        label: 'System Uptime',
        value: '99.98%',
        change: 'Stable',
        trend: 'neutral',
        icon: 'Activity',
    },
    {
        label: 'Total Revenue',
        value: '$4.2M',
        change: '+8.5%',
        trend: 'up',
        icon: 'DollarSign',
    },
    {
        label: 'Active Users',
        value: '3,892',
        change: '+142',
        trend: 'up',
        icon: 'Users',
    },
];

export const MOCK_ALERTS: Alert[] = [
    {
        id: 'a1',
        type: 'critical',
        message: 'Database latency spike detected in US-East region.',
        timestamp: '10 mins ago',
        viewed: false,
    },
    {
        id: 'a2',
        type: 'warning',
        message: 'Tenant "Horizon Energy" payment failed.',
        timestamp: '1 hour ago',
        viewed: false,
    },
    {
        id: 'a3',
        type: 'info',
        message: 'Scheduled maintenance completed successfully.',
        timestamp: '2 hours ago',
        viewed: true,
    },
    {
        id: 'a4',
        type: 'critical',
        message: 'Multiple failed login attempts detected from IP 192.168.1.1',
        timestamp: '5 hours ago',
        viewed: true,
    },
];
