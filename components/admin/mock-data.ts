export const MOCK_FINANCIALS = {
    netProfit: {
        value: '$24,500',
        trend: '+15%',
        trendDirection: 'up', // up, down
    },
    taxLiability: {
        vatCollected: '$12,400',
        vatPaid: '$8,200',
        netPayable: '$4,200',
        status: 'Due in 5 days',
    },
};

export const MOCK_VARIANCE_DATA = [
    { value: 20, label: 'Mon' },
    { value: -10, label: 'Tue' },
    { value: 15, label: 'Wed' },
    { value: 5, label: 'Thu' },
    { value: -30, label: 'Fri' },
    { value: 10, label: 'Sat' },
    { value: 25, label: 'Sun' },
];

export const MOCK_WET_STOCK = [
    { tank: 'Tank 1 (ULP)', level: 0.8, capacity: '25,000L' },
    { tank: 'Tank 2 (Prem)', level: 0.45, capacity: '15,000L' },
    { tank: 'Tank 3 (Diesel)', level: 0.65, capacity: '30,000L' },
];

export const MOCK_DEBTORS = [
    { name: 'Logistics Co.', amount: '$2,400', aging: '45 Days' },
    { name: 'City Taxi Fleet', amount: '$1,150', aging: '15 Days' },
    { name: 'Metro Bus', amount: '$850', aging: '30 Days' },
];

export const MOCK_APPROVALS = [
    { id: '1', request: 'Pump 2 Calibration', user: 'Manager Steve', time: '10m ago' },
    { id: '2', request: 'Price Change (Diesel)', user: 'Manager Sarah', time: '1h ago' },
    { id: '3', request: 'Void Transaction #992', user: 'Cashier John', time: '2h ago' },
];
