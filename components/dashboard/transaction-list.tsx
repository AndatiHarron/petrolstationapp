import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
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
      case 'sale': return '#3b82f6'; // blue
      case 'refund': return '#ef4444'; // red
      case 'adjustment': return '#f59e0b'; // amber
      default: return '#94a3b8'; // slate
    }
  };

  return (
    <View className="rounded-lg bg-slate-800 p-4 shadow-sm">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Recent Activity
        </Text>
        <TouchableOpacity>
          <Text className="text-xs font-bold text-blue-400">View All</Text>
        </TouchableOpacity>
      </View>

      {transactions.map((tx, index) => (
        <View 
          key={tx.id}
          className={`flex-row items-center py-3 ${
            index !== transactions.length - 1 ? 'border-b border-slate-700' : ''
          }`}
        >
          <View className="mr-3 rounded-full bg-slate-700 p-2">
            <SymbolView 
              name={getIcon(tx.type)} 
              size={16} 
              tintColor={getIconColor(tx.type)}
            />
          </View>
          
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="font-medium text-white capitalize">
                {tx.type}
              </Text>
              {tx.pumpId && (
                <Text className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                  Pump {tx.pumpId}
                </Text>
              )}
            </View>
            <Text className="text-xs text-slate-400">
              {tx.timestamp} • {tx.status}
            </Text>
          </View>
          
          <Text className={`font-mono font-bold ${
            tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
};
