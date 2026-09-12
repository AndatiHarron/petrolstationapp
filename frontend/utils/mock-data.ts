export interface KPI {
  id: string;
  label: string;
  value: string;
  trend: number; // percentage change
  type: 'revenue' | 'inventory' | 'discrepancy' | 'neutral';
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'adjustment' | 'refund';
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  pumpId?: string;
}

export interface StatusIndicator {
  id: string;
  label: string;
  status: 'operational' | 'warning' | 'critical';
  value?: string;
}

export const generateMockKPIs = (): KPI[] => [
  {
    id: '1',
    label: 'Daily Revenue',
    value: '$12,450.00',
    trend: 5.2,
    type: 'revenue',
  },
  {
    id: '2',
    label: 'Fuel Inventory',
    value: '45,200 L',
    trend: -2.1,
    type: 'inventory',
  },
  {
    id: '3',
    label: 'Discrepancies',
    value: '0.02%',
    trend: -15.4, // Negative trend is good for discrepancies
    type: 'discrepancy',
  },
  {
    id: '4',
    label: 'Active Pumps',
    value: '8/8',
    trend: 0,
    type: 'neutral',
  },
];

export const generateMockAlerts = (): Alert[] => [
  {
    id: '1',
    severity: 'critical',
    title: 'Integrity Breach Detected',
    message: 'Pump #4 flow rate anomaly detected. Possible tampering.',
    timestamp: '10:42 AM',
  },
  {
    id: '2',
    severity: 'warning',
    title: 'Low Inventory Warning',
    message: 'Tank #2 (Diesel) below 15% capacity.',
    timestamp: '09:15 AM',
  },
];

export const generateMockTransactions = (): Transaction[] => [
  {
    id: 'tx_1',
    type: 'sale',
    amount: 45.50,
    timestamp: '11:30 AM',
    status: 'completed',
    pumpId: '2',
  },
  {
    id: 'tx_2',
    type: 'sale',
    amount: 62.15,
    timestamp: '11:28 AM',
    status: 'completed',
    pumpId: '5',
  },
  {
    id: 'tx_3',
    type: 'refund',
    amount: -12.00,
    timestamp: '11:15 AM',
    status: 'completed',
  },
  {
    id: 'tx_4',
    type: 'sale',
    amount: 35.00,
    timestamp: '11:10 AM',
    status: 'pending',
    pumpId: '1',
  },
  {
    id: 'tx_5',
    type: 'adjustment',
    amount: 0.00,
    timestamp: '10:55 AM',
    status: 'completed',
  },
];

export const generateMockStatusIndicators = (): StatusIndicator[] => [
  { id: 'p1', label: 'Pump 1', status: 'operational' },
  { id: 'p2', label: 'Pump 2', status: 'operational' },
  { id: 'p3', label: 'Pump 3', status: 'warning' },
  { id: 'p4', label: 'Pump 4', status: 'critical' },
  { id: 't1', label: 'Tank 1 (ULP)', status: 'operational', value: '85%' },
  { id: 't2', label: 'Tank 2 (DSL)', status: 'warning', value: '14%' },
];
