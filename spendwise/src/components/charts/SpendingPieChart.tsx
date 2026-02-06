'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { CategoryAmount } from '@/types';

const MAX_SLICES = 8;

interface SpendingPieChartProps {
  data: CategoryAmount[];
  showLegend?: boolean;
  onCategoryClick?: (category: string) => void;
}

export default function SpendingPieChart({ data, showLegend = true, onCategoryClick }: SpendingPieChartProps) {
  // Consolidate small categories into "Other" for readability
  const chartData = useMemo(() => {
    if (!data || data.length <= MAX_SLICES) return data;

    const totalAmount = data.reduce((sum, c) => sum + c.amount, 0);
    const top = data.slice(0, MAX_SLICES).map(c => ({ ...c }));
    const rest = data.slice(MAX_SLICES);
    const otherAmount = rest.reduce((sum, c) => sum + c.amount, 0);
    const otherCount = rest.reduce((sum, c) => sum + (c.transactionCount || 0), 0);

    // Merge into existing "Other" slice if present, otherwise add one
    const existingOther = top.find(c => c.category === 'Other');
    if (existingOther) {
      existingOther.amount += otherAmount;
      existingOther.transactionCount = (existingOther.transactionCount || 0) + otherCount;
      existingOther.percentage = totalAmount > 0 ? (existingOther.amount / totalAmount) * 100 : 0;
    } else {
      top.push({
        category: 'Other',
        amount: otherAmount,
        percentage: totalAmount > 0 ? (otherAmount / totalAmount) * 100 : 0,
        color: '#9CA3AF',
        transactionCount: otherCount,
      });
    }

    return top;
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No spending data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{item.category}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="amount"
          nameKey="category"
          onClick={onCategoryClick ? (entry: any) => {
            const cat = entry.category ?? entry.name ?? entry.payload?.category;
            if (cat) onCategoryClick(cat);
          } : undefined}
          style={onCategoryClick ? { cursor: 'pointer' } : undefined}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
            )}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
