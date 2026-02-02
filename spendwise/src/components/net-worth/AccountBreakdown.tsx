'use client';

import Card from '@/components/ui/Card';
import AccountCard from './AccountCard';
import { formatCurrency } from '@/lib/utils';

interface AccountNetWorth {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
  percentOfTotal: number;
  includeInNetWorth: boolean;
  history: { date: string; value: number }[];
}

interface AccountBreakdownProps {
  accounts: AccountNetWorth[];
  onToggleInclude: (accountId: string) => void;
}

export default function AccountBreakdown({
  accounts,
  onToggleInclude,
}: AccountBreakdownProps) {
  // Split accounts into assets and liabilities
  const assets = accounts.filter((acc) =>
    ['CHECKING', 'SAVINGS', 'INVESTMENT'].includes(acc.accountType)
  );
  const liabilities = accounts.filter((acc) => acc.accountType === 'CREDIT');

  // Calculate subtotals
  const totalAssets = assets.reduce((sum, acc) => sum + (acc.includeInNetWorth ? acc.balance : 0), 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + (acc.includeInNetWorth ? acc.balance : 0), 0);

  return (
    <Card>
      <div className="space-y-6">
        {/* Assets section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assets</h3>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {formatCurrency(totalAssets)}
            </p>
          </div>
          {assets.length > 0 ? (
            <div className="space-y-3">
              {assets.map((account) => (
                <AccountCard
                  key={account.accountId}
                  account={account}
                  onToggleInclude={onToggleInclude}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No asset accounts
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Liabilities section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Liabilities</h3>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {formatCurrency(Math.abs(totalLiabilities))}
            </p>
          </div>
          {liabilities.length > 0 ? (
            <div className="space-y-3">
              {liabilities.map((account) => (
                <AccountCard
                  key={account.accountId}
                  account={account}
                  onToggleInclude={onToggleInclude}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No liability accounts
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
