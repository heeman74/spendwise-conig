'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency, cn } from '@/lib/utils';

interface Holding {
  id: string;
  security: {
    id: string;
    name: string;
    tickerSymbol: string | null;
    type: string;
  };
  quantity: number;
  institutionPrice: number;
  institutionValue: number;
  costBasis: number | null;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
  loading?: boolean;
}

type SortField = 'security' | 'quantity' | 'institutionPrice' | 'institutionValue' | 'costBasis' | 'unrealizedGain';
type SortDirection = 'asc' | 'desc';

export default function HoldingsTable({ holdings, loading = false }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('institutionValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'security':
        aValue = a.security.tickerSymbol || a.security.name;
        bValue = b.security.tickerSymbol || b.security.name;
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'institutionPrice':
        aValue = a.institutionPrice;
        bValue = b.institutionPrice;
        break;
      case 'institutionValue':
        aValue = a.institutionValue;
        bValue = b.institutionValue;
        break;
      case 'costBasis':
        aValue = a.costBasis ?? -Infinity;
        bValue = b.costBasis ?? -Infinity;
        break;
      case 'unrealizedGain':
        aValue = a.unrealizedGain;
        bValue = b.unrealizedGain;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Holdings</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : holdings.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          No holdings found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('security')}
                >
                  <div className="flex items-center gap-1">
                    Security
                    <SortIcon field="security" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Shares
                    <SortIcon field="quantity" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('institutionPrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Price
                    <SortIcon field="institutionPrice" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('institutionValue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Value
                    <SortIcon field="institutionValue" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('costBasis')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Cost Basis
                    <SortIcon field="costBasis" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort('unrealizedGain')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Gain/Loss
                    <SortIcon field="unrealizedGain" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedHoldings.map((holding) => {
                const gainPositive = holding.unrealizedGain >= 0;
                const hasCostBasis = holding.costBasis !== null;

                return (
                  <tr
                    key={holding.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {holding.security.tickerSymbol || holding.security.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {holding.security.type}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-900 dark:text-white">
                      {holding.quantity.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-900 dark:text-white">
                      {formatCurrency(holding.institutionPrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(holding.institutionValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-900 dark:text-white">
                      {hasCostBasis && holding.costBasis !== null ? formatCurrency(holding.costBasis) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {hasCostBasis ? (
                        <div>
                          <div
                            className={cn(
                              'text-sm font-medium',
                              gainPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {gainPositive ? '+' : ''}
                            {formatCurrency(holding.unrealizedGain)}
                          </div>
                          <div
                            className={cn(
                              'text-xs',
                              gainPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            ({gainPositive ? '+' : ''}
                            {holding.unrealizedGainPercent.toFixed(2)}%)
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">—</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
