import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { getCache, setCache, invalidateCache } from '../../lib/redis';
import { parseDecimal } from '../../lib/utils';

/**
 * Normalize security types to standard categories
 */
function normalizeSecurityType(type: string): string {
  const normalized = type.toLowerCase().trim();
  const typeMap: Record<string, string> = {
    stock: 'equity',
    stocks: 'equity',
    equities: 'equity',
    etf: 'etf',
    etfs: 'etf',
    'mutual fund': 'mutual fund',
    'mutual funds': 'mutual fund',
    bond: 'bond',
    bonds: 'bond',
    'fixed income': 'bond',
    cash: 'cash',
    'money market': 'cash',
  };
  return typeMap[normalized] || normalized;
}

/**
 * Format display name for security type
 */
function formatSecurityTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    equity: 'Stocks',
    etf: 'ETFs',
    'mutual fund': 'Mutual Funds',
    bond: 'Bonds',
    cash: 'Cash',
  };
  return nameMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Get color for security type
 */
function getSecurityTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    equity: '#3b82f6', // blue
    etf: '#10b981', // green
    'mutual fund': '#8b5cf6', // purple
    bond: '#f59e0b', // amber
    cash: '#6b7280', // gray
  };
  return colorMap[type] || '#94a3b8'; // default slate
}

export const investmentResolvers = {
  Query: {
    portfolio: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // Check Redis cache
      const cacheKey = `user:${user.id}:portfolio`;
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;

      // Query all INVESTMENT accounts with holdings
      const accounts = await context.prisma.account.findMany({
        where: { userId: user.id, type: 'INVESTMENT' },
        include: {
          holdings: {
            include: { security: true },
          },
        },
      });

      // Aggregate portfolio totals
      let totalValue = 0;
      let totalCostBasis = 0;
      let holdingCount = 0;

      const portfolioAccounts = accounts.map((account) => {
        const accountValue = account.holdings.reduce(
          (sum, holding) => sum + parseDecimal(holding.institutionValue),
          0
        );
        const accountHoldingCount = account.holdings.length;

        // Add to totals
        totalValue += accountValue;
        holdingCount += accountHoldingCount;

        // Sum cost basis (only for holdings that have it)
        account.holdings.forEach((holding) => {
          if (holding.costBasis) {
            totalCostBasis += parseDecimal(holding.costBasis);
          }
        });

        return {
          id: account.id,
          name: account.name,
          institution: account.institution,
          value: accountValue,
          holdingCount: accountHoldingCount,
        };
      });

      // Calculate gains
      const totalGain = totalValue - totalCostBasis;
      const totalGainPercent =
        totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

      const result = {
        totalValue,
        totalCostBasis,
        totalGain,
        totalGainPercent,
        holdingCount,
        accountCount: accounts.length,
        accounts: portfolioAccounts,
      };

      // Cache for 15 minutes
      await setCache(cacheKey, result, 900);

      return result;
    },

    assetAllocation: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // Check Redis cache
      const cacheKey = `user:${user.id}:assetAllocation`;
      const cached = await getCache<Array<Record<string, unknown>>>(cacheKey);
      if (cached) return cached;

      // Fetch all holdings across INVESTMENT accounts
      const accounts = await context.prisma.account.findMany({
        where: { userId: user.id, type: 'INVESTMENT' },
        include: {
          holdings: {
            include: { security: true },
          },
        },
      });

      // Build map of type -> value
      const typeValueMap: Map<string, number> = new Map();
      let totalValue = 0;

      accounts.forEach((account) => {
        account.holdings.forEach((holding) => {
          const value = parseDecimal(holding.institutionValue);
          totalValue += value;

          const normalizedType = normalizeSecurityType(holding.security.type);
          const currentValue = typeValueMap.get(normalizedType) || 0;
          typeValueMap.set(normalizedType, currentValue + value);
        });
      });

      // Build asset allocation array
      const assetAllocation = Array.from(typeValueMap.entries()).map(
        ([type, value]) => ({
          type: formatSecurityTypeName(type),
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
          color: getSecurityTypeColor(type),
        })
      );

      // Cache for 15 minutes
      await setCache(cacheKey, assetAllocation, 900);

      return assetAllocation;
    },

    holdings: async (
      _: unknown,
      { accountId }: { accountId?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Build where clause
      const whereClause: any = {
        account: {
          userId: user.id,
          type: 'INVESTMENT',
        },
      };

      if (accountId) {
        // Verify account ownership
        const account = await context.prisma.account.findFirst({
          where: { id: accountId, userId: user.id, type: 'INVESTMENT' },
        });

        if (!account) {
          throw new Error('Investment account not found');
        }

        whereClause.accountId = accountId;
      }

      // Fetch holdings
      const holdings = await context.prisma.investmentHolding.findMany({
        where: whereClause,
        include: {
          security: true,
          account: true,
        },
        orderBy: {
          institutionValue: 'desc',
        },
      });

      return holdings;
    },
  },

  Mutation: {
    addHolding: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          accountId: string;
          securityName: string;
          tickerSymbol?: string;
          securityType: string;
          quantity: number;
          price: number;
          costBasis?: number;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Verify account ownership
      const account = await context.prisma.account.findFirst({
        where: {
          id: input.accountId,
          userId: user.id,
          type: 'INVESTMENT',
        },
      });

      if (!account) {
        throw new Error('Investment account not found');
      }

      // Look up or create Security
      const plaidSecurityId = input.tickerSymbol || input.securityName;
      const security = await context.prisma.security.upsert({
        where: { plaidSecurityId },
        create: {
          plaidSecurityId,
          name: input.securityName,
          tickerSymbol: input.tickerSymbol,
          type: input.securityType,
        },
        update: {},
      });

      // Create holding
      const holding = await context.prisma.investmentHolding.create({
        data: {
          accountId: input.accountId,
          securityId: security.id,
          quantity: input.quantity,
          institutionPrice: input.price,
          institutionValue: input.quantity * input.price,
          costBasis: input.costBasis || null,
        },
        include: {
          security: true,
          account: true,
        },
      });

      // Invalidate caches
      await invalidateCache(`user:${user.id}:portfolio`);
      await invalidateCache(`user:${user.id}:assetAllocation`);

      return holding;
    },

    updateHoldingPrice: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          holdingId: string;
          newPrice: number;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Find holding and verify ownership
      const holding = await context.prisma.investmentHolding.findUnique({
        where: { id: input.holdingId },
        include: { account: true },
      });

      if (!holding || holding.account.userId !== user.id) {
        throw new Error('Holding not found');
      }

      // Calculate new institution value
      const quantity = parseDecimal(holding.quantity);
      const newInstitutionValue = quantity * input.newPrice;

      // Update holding
      const updatedHolding = await context.prisma.investmentHolding.update({
        where: { id: input.holdingId },
        data: {
          institutionPrice: input.newPrice,
          institutionValue: newInstitutionValue,
        },
        include: {
          security: true,
          account: true,
        },
      });

      // Invalidate caches
      await invalidateCache(`user:${user.id}:portfolio`);
      await invalidateCache(`user:${user.id}:assetAllocation`);

      return updatedHolding;
    },
  },

  InvestmentHolding: {
    unrealizedGain: (parent: any) => {
      const currentValue = parseDecimal(parent.institutionValue);
      const costBasis = parent.costBasis
        ? parseDecimal(parent.costBasis)
        : null;

      if (costBasis === null) {
        return 0; // Can't calculate without cost basis
      }

      return currentValue - costBasis;
    },

    unrealizedGainPercent: (parent: any) => {
      const currentValue = parseDecimal(parent.institutionValue);
      const costBasis = parent.costBasis
        ? parseDecimal(parent.costBasis)
        : null;

      if (costBasis === null || costBasis === 0) {
        return 0; // Can't calculate without cost basis
      }

      return ((currentValue - costBasis) / costBasis) * 100;
    },

    security: async (parent: any, _: unknown, context: Context) => {
      return context.prisma.security.findUnique({
        where: { id: parent.securityId },
      });
    },

    account: async (parent: any, _: unknown, context: Context) => {
      return context.prisma.account.findUnique({
        where: { id: parent.accountId },
      });
    },
  },
};
