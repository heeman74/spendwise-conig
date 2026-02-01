import { DateTimeScalar, DecimalScalar } from './scalars';
import { userResolvers } from './user';
import { accountResolvers } from './account';
import { transactionResolvers } from './transaction';
import { savingsGoalResolvers } from './savingsGoal';
import { analyticsResolvers } from './analytics';
import { adviceResolvers } from './advice';
import { twoFactorResolvers } from './twoFactor';
import { plaidResolvers } from './plaid';
import { statementImportResolvers } from './statementImport';

export const resolvers = {
  DateTime: DateTimeScalar,
  Decimal: DecimalScalar,

  Query: {
    _empty: () => '',
    ...userResolvers.Query,
    ...accountResolvers.Query,
    ...transactionResolvers.Query,
    ...savingsGoalResolvers.Query,
    ...analyticsResolvers.Query,
    ...adviceResolvers.Query,
    ...twoFactorResolvers.Query,
    ...plaidResolvers.Query,
    ...statementImportResolvers.Query,
  },

  Mutation: {
    _empty: () => '',
    ...userResolvers.Mutation,
    ...accountResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...savingsGoalResolvers.Mutation,
    ...twoFactorResolvers.Mutation,
    ...plaidResolvers.Mutation,
    ...statementImportResolvers.Mutation,
  },

  User: userResolvers.User,
  Account: accountResolvers.Account,
  Transaction: transactionResolvers.Transaction,
  SavingsGoal: savingsGoalResolvers.SavingsGoal,
  DashboardStats: analyticsResolvers.DashboardStats,
  PlaidItem: plaidResolvers.PlaidItem,
};
