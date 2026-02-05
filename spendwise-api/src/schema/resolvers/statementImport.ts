import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import type { ImportPreviewData, PreviewTransaction } from '../../lib/parsers/types';
import { createOrUpdateMerchantRule } from '../../lib/merchant-rules';
import { detectRecurringPatterns } from '../../lib/recurring-detector';
import { queue as snapshotQueue } from '../../lib/jobs/snapshotNetWorth';

export const statementImportResolvers = {
  Query: {
    importPreview: async (_: any, { importId }: { importId: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

      const importRecord = await ctx.prisma.statementImport.findFirst({
        where: { id: importId, userId: ctx.user.id },
        include: { account: { select: { id: true, name: true } } },
      });

      if (!importRecord) {
        throw new GraphQLError('Import not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // If still processing, return status without preview data
      if (importRecord.status === 'PENDING' || importRecord.status === 'PARSING') {
        return {
          importId,
          fileName: importRecord.fileName,
          fileFormat: importRecord.fileFormat,
          account: null,
          transactions: [],
          totalTransactions: 0,
          duplicateCount: 0,
          warnings: [],
          matchedAccountId: null,
          matchedAccountName: null,
          status: importRecord.status,
        };
      }

      if (importRecord.status === 'ERROR') {
        return {
          importId,
          fileName: importRecord.fileName,
          fileFormat: importRecord.fileFormat,
          account: null,
          transactions: [],
          totalTransactions: 0,
          duplicateCount: 0,
          warnings: [importRecord.errorMessage || 'Unknown error'],
          matchedAccountId: null,
          matchedAccountName: null,
          status: importRecord.status,
        };
      }

      // Get cached preview data from Redis
      const cached = await ctx.redis.get(`import:preview:${importId}`);
      if (!cached) {
        // Preview expired, try to rebuild from import record
        return {
          importId,
          fileName: importRecord.fileName,
          fileFormat: importRecord.fileFormat,
          account: {
            institution: importRecord.detectedInstitution,
            accountType: importRecord.detectedAccountType,
            accountName: importRecord.detectedAccountName,
            accountMask: importRecord.detectedAccountMask,
          },
          transactions: [],
          totalTransactions: importRecord.transactionsFound,
          duplicateCount: importRecord.duplicatesSkipped,
          warnings: ['Preview data expired. Please re-upload the statement.'],
          matchedAccountId: importRecord.accountId,
          matchedAccountName: importRecord.account?.name || null,
          status: importRecord.status,
        };
      }

      const preview: ImportPreviewData = JSON.parse(cached);

      // Deserialize date strings back to Date objects for DateTime scalar
      const transactions = preview.transactions.map((t) => ({
        ...t,
        date: new Date(t.date),
        category: t.suggestedCategory,
        categoryConfidence: t.categoryConfidence ?? 50,
        categorySource: t.categorySource ?? 'keyword',
        cleanedMerchant: t.cleanedMerchant ?? t.merchant ?? '',
      }));

      return {
        importId: preview.importId,
        fileName: preview.fileName,
        fileFormat: preview.fileFormat,
        account: preview.account,
        transactions,
        totalTransactions: preview.totalTransactions,
        duplicateCount: preview.duplicateCount,
        warnings: preview.warnings,
        matchedAccountId: importRecord.accountId,
        matchedAccountName: importRecord.account?.name || null,
        status: importRecord.status,
      };
    },

    importHistory: async (_: any, { limit = 20, offset = 0 }: { limit?: number; offset?: number }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

      const imports = await ctx.prisma.statementImport.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { account: { select: { name: true } } },
      });

      return imports.map((imp) => ({
        id: imp.id,
        fileName: imp.fileName,
        fileFormat: imp.fileFormat,
        fileSize: imp.fileSize,
        status: imp.status,
        accountId: imp.accountId,
        accountName: imp.account?.name || null,
        detectedInstitution: imp.detectedInstitution,
        detectedAccountType: imp.detectedAccountType,
        transactionsFound: imp.transactionsFound,
        transactionsImported: imp.transactionsImported,
        duplicatesSkipped: imp.duplicatesSkipped,
        errorMessage: imp.errorMessage,
        createdAt: imp.createdAt,
        completedAt: imp.completedAt,
      }));
    },
  },

  Mutation: {
    confirmImport: async (_: any, { input }: { input: any }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

      const importRecord = await ctx.prisma.statementImport.findFirst({
        where: { id: input.importId, userId: ctx.user.id, status: 'PREVIEW' },
      });

      if (!importRecord) {
        throw new GraphQLError('Import not found or not in preview state', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Get cached preview data
      const cached = await ctx.redis.get(`import:preview:${input.importId}`);
      if (!cached) {
        throw new GraphQLError('Preview data expired. Please re-upload the statement.', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const preview: ImportPreviewData = JSON.parse(cached);

      // Update status to IMPORTING
      await ctx.prisma.statementImport.update({
        where: { id: input.importId },
        data: { status: 'IMPORTING' },
      });

      try {
        // Determine or create account
        let accountId: string;

        if (input.accountId) {
          // Verify account belongs to user
          const account = await ctx.prisma.account.findFirst({
            where: { id: input.accountId, userId: ctx.user.id },
          });
          if (!account) {
            throw new GraphQLError('Account not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }
          accountId = input.accountId;
        } else if (input.createNewAccount) {
          // Build account details
          const accountName = input.newAccountName || preview.account.accountName || `${preview.account.institution || 'Unknown'} Account`;
          const accountType = (input.newAccountType || preview.account.accountType || 'CHECKING') as any;
          const accountInstitution = input.newAccountInstitution || preview.account.institution || 'Unknown';

          // Check for existing account with same name, type, and institution
          const existingAccount = await ctx.prisma.account.findFirst({
            where: {
              userId: ctx.user.id,
              name: accountName,
              type: accountType,
              institution: accountInstitution,
            },
          });

          if (existingAccount) {
            // Reuse existing account instead of creating a duplicate
            accountId = existingAccount.id;
          } else {
            const newAccount = await ctx.prisma.account.create({
              data: {
                userId: ctx.user.id,
                name: accountName,
                type: accountType,
                institution: accountInstitution,
                balance: 0,
                mask: preview.account.accountMask || null,
              },
            });
            accountId = newAccount.id;
          }
        } else if (importRecord.accountId) {
          accountId = importRecord.accountId;
        } else {
          throw new GraphQLError('No account specified. Please select an existing account or create a new one.', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Apply category overrides and create merchant rules for overrides
        const transactions = [...preview.transactions];
        if (input.categoryOverrides) {
          for (const override of input.categoryOverrides) {
            if (override.index >= 0 && override.index < transactions.length) {
              transactions[override.index].suggestedCategory = override.category;
              transactions[override.index].categoryConfidence = 100;
              transactions[override.index].categorySource = 'manual';

              // Save merchant rule for the override
              const merchant = transactions[override.index].merchant ||
                transactions[override.index].cleanedMerchant;
              if (merchant) {
                try {
                  await createOrUpdateMerchantRule(ctx.prisma, ctx.user!.id, merchant, override.category);
                } catch (error) {
                  console.error('Failed to save merchant rule for override:', error);
                }
              }
            }
          }
        }

        // Filter out duplicates if requested
        const skipDuplicates = input.skipDuplicates !== false; // Default true
        const toImport = skipDuplicates
          ? transactions.filter((t) => !t.isDuplicate)
          : transactions;

        const duplicatesSkipped = transactions.length - toImport.length;

        // Bulk create transactions
        if (toImport.length > 0) {
          await ctx.prisma.transaction.createMany({
            data: toImport.map((t: PreviewTransaction) => ({
              userId: ctx.user!.id,
              accountId,
              amount: t.amount,
              type: t.type as any,
              category: t.suggestedCategory,
              merchant: t.cleanedMerchant || t.merchant || null,
              description: t.description,
              date: new Date(t.date),
              plaidTransactionId: t.fitId || null,
              importId: input.importId,
              categoryConfidence: t.categoryConfidence ?? 50,
              categorySource: t.categorySource ?? 'keyword',
            })),
          });

          // Update account balance
          const totalChange = toImport.reduce((sum, t) => {
            return sum + (t.type === 'INCOME' ? t.amount : -t.amount);
          }, 0);

          await ctx.prisma.account.update({
            where: { id: accountId },
            data: {
              balance: { increment: totalChange },
              lastSynced: new Date(),
            },
          });
        }

        // Update import record
        await ctx.prisma.statementImport.update({
          where: { id: input.importId },
          data: {
            status: 'COMPLETED',
            accountId,
            transactionsImported: toImport.length,
            duplicatesSkipped,
            completedAt: new Date(),
          },
        });

        // Handle manually flagged recurring transactions
        if (input.recurringIndices && input.recurringIndices.length > 0 && toImport.length > 0) {
          try {
            // Look up the just-created transactions for this import
            const createdTransactions = await ctx.prisma.transaction.findMany({
              where: { importId: input.importId, userId: ctx.user!.id },
              orderBy: { date: 'asc' },
              select: { id: true, merchant: true, amount: true, category: true, date: true, type: true },
            });

            // Map original toImport indices to created transactions
            // toImport preserves order, and createMany preserves insertion order
            const flaggedByMerchant = new Map<string, {
              ids: string[];
              amounts: number[];
              category: string;
              dates: Date[];
              type: string;
            }>();

            for (const idx of input.recurringIndices) {
              if (idx < 0 || idx >= toImport.length || idx >= createdTransactions.length) continue;
              const txn = createdTransactions[idx];
              const merchantName = txn.merchant || 'Unknown';
              const existing = flaggedByMerchant.get(merchantName);
              if (existing) {
                existing.ids.push(txn.id);
                existing.amounts.push(parseFloat(txn.amount.toString()));
                existing.dates.push(txn.date);
              } else {
                flaggedByMerchant.set(merchantName, {
                  ids: [txn.id],
                  amounts: [parseFloat(txn.amount.toString())],
                  category: txn.category,
                  dates: [txn.date],
                  type: txn.type,
                });
              }
            }

            for (const [merchantName, data] of flaggedByMerchant) {
              const avg = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
              const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
              const firstDate = sortedDates[0];
              const lastDate = sortedDates[sortedDates.length - 1];

              await ctx.prisma.recurringTransaction.upsert({
                where: {
                  userId_merchantName_frequency: {
                    userId: ctx.user!.id,
                    merchantName,
                    frequency: 'MONTHLY',
                  },
                },
                create: {
                  userId: ctx.user!.id,
                  plaidStreamId: require('crypto').randomUUID(),
                  description: `${merchantName} (manually flagged)`,
                  merchantName,
                  category: data.category,
                  frequency: 'MONTHLY',
                  isActive: true,
                  isDismissed: false,
                  status: 'ACTIVE',
                  lastAmount: data.amounts[data.amounts.length - 1],
                  averageAmount: avg,
                  lastDate,
                  firstDate,
                  transactionIds: data.ids,
                },
                update: {
                  lastAmount: data.amounts[data.amounts.length - 1],
                  averageAmount: avg,
                  lastDate,
                  transactionIds: { push: data.ids },
                  isActive: true,
                  isDismissed: false,
                },
              });
            }
          } catch (recurringError) {
            console.error('Manual recurring flagging failed (non-blocking):', recurringError);
          }
        }

        // Trigger recurring transaction detection (non-blocking)
        // Detection analyzes full transaction history, not just this import
        let recurringPatternsDetected: Array<{ merchantName: string; frequency: string; averageAmount: number }> = [];
        try {
          const allTransactions = await ctx.prisma.transaction.findMany({
            where: { userId: ctx.user!.id },
            orderBy: { date: 'asc' },
            select: {
              id: true,
              date: true,
              amount: true,
              merchant: true,
              category: true,
              type: true,
            },
          });

          const patterns = detectRecurringPatterns(
            allTransactions.map((t) => ({
              id: t.id,
              date: t.date,
              amount: parseFloat(t.amount.toString()),
              merchant: t.merchant,
              category: t.category,
              type: t.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
            }))
          );

          // Upsert detected patterns
          for (const pattern of patterns) {
            await ctx.prisma.recurringTransaction.upsert({
              where: {
                userId_merchantName_frequency: {
                  userId: ctx.user!.id,
                  merchantName: pattern.merchantName,
                  frequency: pattern.frequency,
                },
              },
              create: {
                userId: ctx.user!.id,
                plaidStreamId: require('crypto').randomUUID(),
                description: pattern.description,
                merchantName: pattern.merchantName,
                category: pattern.category,
                frequency: pattern.frequency,
                isActive: true,
                isDismissed: false,
                status: pattern.status,
                lastAmount: pattern.lastAmount,
                averageAmount: pattern.averageAmount,
                lastDate: pattern.lastDate,
                firstDate: pattern.firstDate,
                nextExpectedDate: pattern.nextExpectedDate,
                transactionIds: pattern.transactionIds,
              },
              update: {
                lastAmount: pattern.lastAmount,
                averageAmount: pattern.averageAmount,
                lastDate: pattern.lastDate,
                transactionIds: pattern.transactionIds,
                nextExpectedDate: pattern.nextExpectedDate,
                status: pattern.status,
                description: pattern.description,
              },
            });
          }

          recurringPatternsDetected = patterns.map((p) => ({
            merchantName: p.merchantName,
            frequency: p.frequency,
            averageAmount: parseFloat(p.averageAmount.toString()),
          }));
        } catch (detectError) {
          // Non-blocking: log but don't fail the import
          console.error('Recurring detection failed (non-blocking):', detectError);
        }

        // Trigger net worth snapshot (non-blocking)
        // Captures current balances after import completes
        try {
          if (snapshotQueue) {
            await snapshotQueue.add('on-demand-snapshot', {
              userId: ctx.user!.id,
              trigger: 'import',
            });
            console.log(`[NetWorth] Queued on-demand snapshot for user ${ctx.user!.id} after import`);
          }
        } catch (snapshotError) {
          // Non-blocking: log but don't fail the import
          console.error('[NetWorth] Failed to queue snapshot after import (non-blocking):', snapshotError);
        }

        // Invalidate insight cache after import (non-blocking)
        // Ensures insights reflect latest transactions
        try {
          await ctx.prisma.insightCache.updateMany({
            where: {
              userId: ctx.user!.id,
              invalidatedAt: null,
            },
            data: {
              invalidatedAt: new Date(),
            },
          });
          console.log(`[Insights] Invalidated insight cache for user ${ctx.user!.id} after import`);
        } catch (insightError) {
          // Non-blocking: log but don't fail the import
          console.error('[Insights] Failed to invalidate insight cache after import (non-blocking):', insightError);
        }

        // Clean up Redis cache
        await ctx.redis.del(`import:preview:${input.importId}`);

        return {
          success: true,
          message: `Successfully imported ${toImport.length} transactions`,
          accountId,
          transactionsImported: toImport.length,
          duplicatesSkipped,
          recurringPatternsDetected,
        };
      } catch (error: any) {
        // Revert status on error
        await ctx.prisma.statementImport.update({
          where: { id: input.importId },
          data: {
            status: 'ERROR',
            errorMessage: error.message || 'Failed to import transactions',
          },
        });
        throw error;
      }
    },

    cancelImport: async (_: any, { importId }: { importId: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

      const importRecord = await ctx.prisma.statementImport.findFirst({
        where: {
          id: importId,
          userId: ctx.user.id,
          status: { in: ['PENDING', 'PARSING', 'PREVIEW'] },
        },
      });

      if (!importRecord) {
        throw new GraphQLError('Import not found or cannot be cancelled', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await ctx.prisma.statementImport.delete({
        where: { id: importId },
      });

      // Clean up Redis
      await ctx.redis.del(`import:preview:${importId}`);

      return true;
    },

    deleteImport: async (_: any, { importId }: { importId: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

      const importRecord = await ctx.prisma.statementImport.findFirst({
        where: { id: importId, userId: ctx.user.id },
      });

      if (!importRecord) {
        throw new GraphQLError('Import not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // If the import was completed, we need to reverse the transactions and balance changes
      let transactionsDeleted = 0;

      if (importRecord.status === 'COMPLETED' && importRecord.accountId) {
        // Find all transactions created by this import
        const importedTransactions = await ctx.prisma.transaction.findMany({
          where: { importId, userId: ctx.user.id },
          select: { id: true, amount: true, type: true },
        });

        transactionsDeleted = importedTransactions.length;

        if (transactionsDeleted > 0) {
          // Calculate the balance reversal
          const balanceReversal = importedTransactions.reduce((sum, t) => {
            const amount = typeof t.amount === 'object' ? Number(t.amount) : t.amount;
            return sum + (t.type === 'INCOME' ? -amount : amount);
          }, 0);

          // Delete the transactions
          await ctx.prisma.transaction.deleteMany({
            where: { importId, userId: ctx.user.id },
          });

          // Reverse the account balance change
          await ctx.prisma.account.update({
            where: { id: importRecord.accountId },
            data: { balance: { increment: balanceReversal } },
          });
        }
      }

      // Delete the import record
      await ctx.prisma.statementImport.delete({
        where: { id: importId },
      });

      // Clean up Redis
      await ctx.redis.del(`import:preview:${importId}`);

      return {
        success: true,
        message: transactionsDeleted > 0
          ? `Deleted import and ${transactionsDeleted} transactions`
          : 'Deleted import record',
        transactionsDeleted,
      };
    },
  },
};
