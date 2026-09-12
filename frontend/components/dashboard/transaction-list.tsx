import React from 'react';
import { AppIcon } from '../app-icon';
import { View, Text, TouchableOpacity } from 'react-native';
import { Transaction } from '../../utils/mock-data';

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList = ({ transactions }: TransactionListProps) => {
  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'sale': return 'fuelpump.fill';
      case 'refund': return 'arrow.uturn.backward.circle.fill';
      case 'adjustment': return 'slider.horizontal.3';
      default: return 'doc.text.fill';
    }
  };

  const getIconColor = (type: Transaction['type']) => {
    switch (type) {
      case 'sale': return '#040273'; // blue
      case 'refund': return '#bf0a30'; // red
      case 'adjustment': return '#f59e0b'; // amber
      default: return '#8b8b99'; // slate
    }
  };

  return (
    <View className="rounded-lg bg-surface p-4 shadow-sm">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wider text-ink-muted">
          Recent Activity
        </Text>
        <TouchableOpacity>
          <Text className="text-xs font-bold text-brand">View All</Text>
        </TouchableOpacity>
      </View>

      {transactions.map((tx, index) => (
        <View 
          key={tx.id}
          className={`flex-row items-center py-3 ${
            index !== transactions.length - 1 ? 'border-b border-surface-border' : ''
          }`}
        >
          <View className="mr-3 rounded-full bg-surface-border p-2">
            <AppIcon name={getIcon(tx.type)} size={16} color={getIconColor(tx.type)} />
          </View>
          
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="font-medium text-ink capitalize">
                {tx.type}
              </Text>
              {tx.pumpId && (
                <Text className="ml-2 rounded bg-surface-border px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  Pump {tx.pumpId}
                </Text>
              )}
            </View>
            <Text className="text-xs text-ink-muted">
              {tx.timestamp} • {tx.status}
            </Text>
          </View>
          
          <Text className={`font-mono font-bold ${
            tx.amount < 0 ? 'text-accent' : 'text-emerald-400'
          }`}>
            {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
};
