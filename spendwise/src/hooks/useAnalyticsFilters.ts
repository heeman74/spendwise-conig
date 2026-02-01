'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

export function useAnalyticsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params or defaults
  const [dateRange, setDateRangeState] = useState<{ from: Date; to: Date }>(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    return {
      from: fromParam ? parseISO(fromParam) : startOfMonth(new Date()),
      to: toParam ? parseISO(toParam) : endOfMonth(new Date()),
    };
  });

  const [accountIds, setAccountIdsState] = useState<string[]>(() => {
    const accountsParam = searchParams.get('accounts');
    return accountsParam ? accountsParam.split(',').filter(Boolean) : [];
  });

  const setDateRange = useCallback(
    (range: { from: Date; to: Date }) => {
      setDateRangeState(range);

      const params = new URLSearchParams(searchParams.toString());
      params.set('from', format(range.from, 'yyyy-MM-dd'));
      params.set('to', format(range.to, 'yyyy-MM-dd'));

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setAccountIds = useCallback(
    (ids: string[]) => {
      setAccountIdsState(ids);

      const params = new URLSearchParams(searchParams.toString());
      if (ids.length > 0) {
        params.set('accounts', ids.join(','));
      } else {
        params.delete('accounts');
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Sync state with URL params when they change externally
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const accountsParam = searchParams.get('accounts');

    if (fromParam && toParam) {
      const newFrom = parseISO(fromParam);
      const newTo = parseISO(toParam);
      if (newFrom.getTime() !== dateRange.from.getTime() || newTo.getTime() !== dateRange.to.getTime()) {
        setDateRangeState({ from: newFrom, to: newTo });
      }
    }

    if (accountsParam !== null) {
      const newIds = accountsParam.split(',').filter(Boolean);
      if (JSON.stringify(newIds) !== JSON.stringify(accountIds)) {
        setAccountIdsState(newIds);
      }
    }
  }, [searchParams]);

  return {
    dateRange,
    accountIds,
    setDateRange,
    setAccountIds,
  };
}
