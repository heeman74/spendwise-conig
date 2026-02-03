'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface InlineChartProps {
  type: 'trend' | 'breakdown';
  data: any[];
  title: string;
}

export default function InlineChart({ type, data, title }: InlineChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 my-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</h4>
      <div style={{ height: '200px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'trend' ? (
            <LineChart data={data}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#9ca3af"
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#3b82f6' }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#9ca3af" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#9ca3af"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
