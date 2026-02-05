import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { requireAuth, NotFoundError, ForbiddenError } from '../../middleware/authMiddleware';
import { invalidateCache } from '../../lib/redis';
import { plaidClient, Products, CountryCode } from '../../lib/plaid-client';
import { AccountSubtype } from 'plaid';

interface ExchangePublicTokenInput {
  publicToken: string;
  institutionId: string;
  institutionName: string;
}

// Helper function to map Plaid account type to our AccountType enum
function mapPlaidAccountType(
  plaidType: string,
  plaidSubtype: string | null
): 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' {
  if (plaidType === 'depository') {
    return plaidSubtype === 'savings' ? 'SAVINGS' : 'CHECKING';
  }
  if (plaidType === 'credit') return 'CREDIT';
  if (plaidType === 'investment') return 'INVESTMENT';
  return 'CHECKING'; // fallback
}

export const plaidResolvers = {
  Query: {
    plaidItems: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      return context.prisma.plaidItem.findMany({
        where: { userId: user.id },
        include: { accounts: true },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    createLinkToken: async (
      _: unknown,
      { itemId }: { itemId?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Update mode - re-authentication
        if (itemId) {
          const plaidItem = await context.prisma.plaidItem.findFirst({
            where: { id: itemId, userId: user.id },
          });

          if (!plaidItem) {
            throw new NotFoundError('PlaidItem');
          }

          const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: user.id },
            client_name: 'SpendWise',
            country_codes: [CountryCode.Us],
            language: 'en',
            access_token: plaidItem.accessToken,
            // Do NOT include products in update mode
          });

          return {
            linkToken: response.data.link_token,
            expiration: response.data.expiration,
          };
        }

        // Create mode - new connection
        const config: any = {
          user: { client_user_id: user.id },
          client_name: 'SpendWise',
          products: [Products.Transactions, Products.Investments],
          country_codes: [CountryCode.Us],
          language: 'en',
          account_filters: {
            depository: {
              account_subtypes: [AccountSubtype.Checking, AccountSubtype.Savings],
            },
            credit: {
              account_subtypes: [AccountSubtype.CreditCard],
            },
            investment: {
              account_subtypes: [
                AccountSubtype._401k,
                AccountSubtype._403B,
                AccountSubtype.Ira,
                AccountSubtype.Roth,
                AccountSubtype.Brokerage,
              ],
            },
          },
        };

        if (process.env.PLAID_WEBHOOK_URL) {
          config.webhook = process.env.PLAID_WEBHOOK_URL;
        }

        if (process.env.PLAID_REDIRECT_URI) {
          config.redirect_uri = process.env.PLAID_REDIRECT_URI;
        }

        const response = await plaidClient.linkTokenCreate(config);

        return {
          linkToken: response.data.link_token,
          expiration: response.data.expiration,
        };
      } catch (error: any) {
        console.error('Plaid createLinkToken error:', error);
        throw new GraphQLError(error.message || 'Failed to create link token', {
          extensions: {
            code: 'PLAID_ERROR',
            plaidError: error.response?.data,
          },
        });
      }
    },

    exchangePublicToken: async (
      _: unknown,
      { input }: { input: ExchangePublicTokenInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Exchange public token for access token
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: input.publicToken,
        });

        const accessToken = exchangeResponse.data.access_token;
        const itemId = exchangeResponse.data.item_id;

        // Get account details
        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        // Create PlaidItem record
        const plaidItem = await context.prisma.plaidItem.create({
          data: {
            userId: user.id,
            accessToken, // Encrypted automatically by prisma-field-encryption
            plaidItemId: itemId,
            plaidInstitutionId: input.institutionId,
            institutionName: input.institutionName,
            status: 'active',
          },
        });

        // Create Account records for each account (skip if already linked)
        let accountsCreated = 0;
        for (const plaidAccount of accountsResponse.data.accounts) {
          // Check if this Plaid account is already linked
          const existingAccount = await context.prisma.account.findFirst({
            where: {
              userId: user.id,
              plaidAccountId: plaidAccount.account_id,
            },
          });

          if (existingAccount) {
            // Update existing account instead of creating a duplicate
            await context.prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                plaidItemId: plaidItem.id,
                balance: plaidAccount.balances.current ?? 0,
                lastSynced: new Date(),
                isLinked: true,
              },
            });
            continue;
          }

          const accountType = mapPlaidAccountType(
            plaidAccount.type,
            plaidAccount.subtype
          );

          await context.prisma.account.create({
            data: {
              userId: user.id,
              plaidItemId: plaidItem.id,
              plaidAccountId: plaidAccount.account_id,
              name: plaidAccount.name,
              officialName: plaidAccount.official_name || undefined,
              mask: plaidAccount.mask || undefined,
              type: accountType,
              balance: plaidAccount.balances.current ?? 0,
              institution: input.institutionName,
              isLinked: true,
              lastSynced: new Date(),
            },
          });
          accountsCreated++;
        }

        // Invalidate cache
        await invalidateCache(`user:${user.id}:*`);

        // Fetch the created item with accounts
        const itemWithAccounts = await context.prisma.plaidItem.findUnique({
          where: { id: plaidItem.id },
          include: { accounts: true },
        });

        return {
          plaidItem: itemWithAccounts,
          accountsCreated,
        };
      } catch (error: any) {
        console.error('Plaid exchangePublicToken error:', error);
        throw new GraphQLError(error.message || 'Failed to exchange public token', {
          extensions: {
            code: 'PLAID_ERROR',
            plaidError: error.response?.data,
          },
        });
      }
    },

    unlinkItem: async (
      _: unknown,
      { itemId, keepAsManual }: { itemId: string; keepAsManual: boolean },
      context: Context
    ) => {
      const user = requireAuth(context);

      try {
        // Verify item belongs to user
        const plaidItem = await context.prisma.plaidItem.findFirst({
          where: { id: itemId, userId: user.id },
          include: { accounts: true },
        });

        if (!plaidItem) {
          throw new NotFoundError('PlaidItem');
        }

        const accountsAffected = plaidItem.accounts.length;

        // Revoke access with Plaid
        try {
          await plaidClient.itemRemove({
            access_token: plaidItem.accessToken,
          });
        } catch (plaidError: any) {
          // Log but continue - we still want to clean up locally even if Plaid call fails
          console.error('Plaid itemRemove error:', plaidError);
        }

        // Use a transaction to handle accounts and item
        if (keepAsManual) {
          // Convert accounts to manual
          await context.prisma.$transaction([
            context.prisma.account.updateMany({
              where: { plaidItemId: itemId },
              data: {
                isLinked: false,
                plaidAccountId: null,
                plaidItemId: null,
              },
            }),
            context.prisma.plaidItem.delete({
              where: { id: itemId },
            }),
          ]);
        } else {
          // Delete accounts (cascade will handle transactions)
          await context.prisma.$transaction([
            context.prisma.account.deleteMany({
              where: { plaidItemId: itemId },
            }),
            context.prisma.plaidItem.delete({
              where: { id: itemId },
            }),
          ]);
        }

        // Invalidate cache
        await invalidateCache(`user:${user.id}:*`);

        return {
          success: true,
          accountsAffected,
          keptAsManual: keepAsManual,
        };
      } catch (error: any) {
        // Re-throw GraphQL errors
        if (error instanceof GraphQLError) {
          throw error;
        }

        console.error('Plaid unlinkItem error:', error);
        throw new GraphQLError(error.message || 'Failed to unlink item', {
          extensions: {
            code: 'PLAID_ERROR',
          },
        });
      }
    },

    updateItemStatus: async (
      _: unknown,
      { itemId, status }: { itemId: string; status: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Verify item belongs to user
      const existing = await context.prisma.plaidItem.findFirst({
        where: { id: itemId, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('PlaidItem');
      }

      const plaidItem = await context.prisma.plaidItem.update({
        where: { id: itemId },
        data: { status },
        include: { accounts: true },
      });

      await invalidateCache(`user:${user.id}:*`);

      return plaidItem;
    },
  },

  PlaidItem: {
    accounts: async (parent: { id: string }, _: unknown, context: Context) => {
      // Fallback field resolver in case include wasn't used
      if ('accounts' in parent && Array.isArray((parent as any).accounts)) {
        return (parent as any).accounts;
      }

      return context.prisma.account.findMany({
        where: { plaidItemId: parent.id },
      });
    },
  },
};
