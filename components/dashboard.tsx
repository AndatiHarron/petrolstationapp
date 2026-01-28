import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { KPICard } from './dashboard/kpi-card';
import { AlertBanner } from './dashboard/alert-banner';
import { TransactionList } from './dashboard/transaction-list';
import { QuickActionButton } from './dashboard/quick-action-button';
import { StatusIndicator } from './dashboard/status-indicator';
import { ChartCard } from './dashboard/chart-card';
import { 
  generateMockKPIs, 
  generateMockAlerts, 
  generateMockTransactions, 
  generateMockStatusIndicators,
  KPI,
  Alert,
  Transaction,
  StatusIndicator as StatusIndicatorType
} from '../utils/mock-data';

export const Dashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [indicators, setIndicators] = useState<StatusIndicatorType[]>([]);

  const loadData = () => {
    setKpis(generateMockKPIs());
    setAlerts(generateMockAlerts());
    setTransactions(generateMockTransactions());
    setIndicators(generateMockStatusIndicators());
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate network request
    setTimeout(() => {
      loadData();
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleDismissAlert = (id: string) => {
    setAlerts(current => current.filter(a => a.id !== id));
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="px-4 pt-4">
        {/* Alerts Section */}
        {alerts.map(alert => (
          <AlertBanner 
            key={alert.id} 
            alert={alert} 
            onDismiss={handleDismissAlert} 
          />
        ))}

        {/* KPI Grid */}
        <View className="mb-2 flex-row flex-wrap justify-between">
          {kpis.map((kpi, index) => (
            <KPICard key={kpi.id} kpi={kpi} index={index} />
          ))}
        </View>

        {/* Quick Actions */}
        <Text className="mb-3 mt-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          Quick Actions
        </Text>
        <View className="mb-2 flex-row flex-wrap justify-between">
          <QuickActionButton 
            label="Start Shift" 
            icon="clock.fill" 
            color="#3b82f6" 
          />
          <QuickActionButton 
            label="Report Issue" 
            icon="exclamationmark.triangle.fill" 
            color="#ef4444" 
          />
          <QuickActionButton 
            label="Inventory" 
            icon="drop.fill" 
            color="#f59e0b" 
          />
          <QuickActionButton 
            label="Reports" 
            icon="doc.text.fill" 
            color="#10b981" 
          />
        </View>

        {/* Chart Section */}
        <ChartCard />

        {/* Status Indicators */}
        <Text className="mb-3 mt-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          System Status
        </Text>
        <View className="mb-6">
          {indicators.map((indicator, index) => (
            <StatusIndicator 
              key={indicator.id} 
              indicator={indicator} 
              index={index} 
            />
          ))}
        </View>

        {/* Recent Transactions */}
        <TransactionList transactions={transactions} />
      </View>
    </ScrollView>
  );
};
