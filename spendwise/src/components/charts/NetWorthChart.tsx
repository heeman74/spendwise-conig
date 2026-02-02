'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { TIME_RANGE_LABELS } from '@/hooks/useNetWorth';

interface NetWorthChartProps {
  data: { date: string; value: number }[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export default function NetWorthChart({
  data,
  timeRange,
  onTimeRangeChange,
}: NetWorthChartProps) {
  const timeRangeOptions = Object.keys(TIME_RANGE_LABELS);

  // Determine trend direction
  const trendPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const strokeColor = trendPositive ? '#10b981' : '#ef4444';

  // Apply adaptive granularity
  const processedData = React.useMemo(() => {
    if (timeRange === 'ONE_MONTH' || timeRange === 'THREE_MONTHS') {
      // Show all daily data points
      return data;
    } else if (timeRange === 'SIX_MONTHS') {
      // Sample weekly (first data point of each week)
      return sampleWeekly(data);
    } else {
      // ONE_YEAR, ALL: Sample monthly (first data point of each month)
      return sampleMonthly(data);
    }
  }, [data, timeRange]);

  // Format X-axis date based on time range
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    if (timeRange === 'ONE_MONTH' || timeRange === 'THREE_MONTHS') {
      // MMM dd
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // MMM yyyy
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            {new Date(label).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Net Worth: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No net worth data available
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* Time range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {timeRangeOptions.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#374151', opacity: 0.3 }}
              tickFormatter={formatXAxis}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#374151', opacity: 0.3 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={{ fill: strokeColor, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Helper functions for adaptive granularity
function sampleWeekly(data: { date: string; value: number }[]) {
  const result: { date: string; value: number }[] = [];
  let lastWeek = -1;

  data.forEach((point) => {
    const date = new Date(point.date);
    const weekOfYear = getWeekOfYear(date);

    if (weekOfYear !== lastWeek) {
      result.push(point);
      lastWeek = weekOfYear;
    }
  });

  return result;
}

function sampleMonthly(data: { date: string; value: number }[]) {
  const result: { date: string; value: number }[] = [];
  let lastMonth = -1;

  data.forEach((point) => {
    const date = new Date(point.date);
    const month = date.getMonth();

    if (month !== lastMonth) {
      result.push(point);
      lastMonth = month;
    }
  });

  return result;
}

function getWeekOfYear(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Import React for useMemo
import React from 'react';
