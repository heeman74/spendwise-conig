'use client';

import { MerchantStats } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TopMerchantsTableProps {
  merchants: MerchantStats[];
  loading: boolean;
}

export default function TopMerchantsTable({ merchants, loading }: TopMerchantsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
        Loading merchants...
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
        No merchant data available for this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
            <th className="pb-3">Merchant</th>
            <th className="pb-3 text-right">Transactions</th>
            <th className="pb-3 text-right">Total Spent</th>
            <th className="pb-3 text-right">Avg. per Transaction</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((merchant, idx) => (
            <tr
              key={merchant.merchant}
              className="border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {merchant.merchant}
                  </span>
                </div>
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                {merchant.transactionCount}
              </td>
              <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                {formatCurrency(merchant.totalAmount)}
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                {formatCurrency(merchant.averageAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
