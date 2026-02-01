import { PrismaClient, AccountType, TransactionType } from '@prisma/client';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const categories = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
];

const merchants: Record<string, string[]> = {
  'Food & Dining': ['Starbucks', 'Chipotle', 'Whole Foods', 'DoorDash', 'Uber Eats', 'McDonalds', 'Panera Bread'],
  'Shopping': ['Amazon', 'Target', 'Walmart', 'Best Buy', 'Nike', 'Apple Store', 'IKEA'],
  'Transportation': ['Shell', 'Uber', 'Lyft', 'Metro Transit', 'Chevron', 'Tesla Charging'],
  'Bills & Utilities': ['Electric Co', 'Water Utility', 'Comcast', 'AT&T', 'Gas Company'],
  'Entertainment': ['Netflix', 'Spotify', 'AMC Theaters', 'Steam', 'PlayStation Store'],
  'Healthcare': ['CVS Pharmacy', 'Walgreens', 'Doctor Visit', 'Dental Care'],
  'Travel': ['United Airlines', 'Marriott', 'Airbnb', 'Expedia', 'Hertz'],
  'Education': ['Udemy', 'Coursera', 'Barnes & Noble', 'School District'],
  'Personal Care': ['Salon', 'Planet Fitness', 'Spa', 'Sephora'],
  'Income': ['Paycheck', 'Freelance', 'Dividend', 'Bonus', 'Tax Refund'],
  'Transfer': ['Bank Transfer', 'Savings Transfer'],
};

async function main() {
  console.log('Starting seed...');

  // Create demo user
  const hashedPassword = await hash('demo123456', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@spendwise.com' },
    update: {},
    create: {
      email: 'demo@spendwise.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  });

  console.log('Created user:', user.email);

  // Create 2FA test user (existing-user@example.com / password123)
  const twoFactorPassword = await hash('password123', 12);

  const twoFactorUser = await prisma.user.upsert({
    where: { email: 'existing-user@example.com' },
    update: {},
    create: {
      email: 'existing-user@example.com',
      name: '2FA Test User',
      password: twoFactorPassword,
      twoFactorEmailEnabled: true,
      emailVerified: true,
    },
  });

  // Generate backup codes for 2FA user
  const backupCodeHashes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    backupCodeHashes.push(await hash(code, 12));
  }
  await prisma.user.update({
    where: { id: twoFactorUser.id },
    data: { backupCodes: JSON.stringify(backupCodeHashes) },
  });

  console.log('Created 2FA user:', twoFactorUser.email);

  // Create multi-method 2FA user (multi-method-user@example.com / password123)
  const multiMethodUser = await prisma.user.upsert({
    where: { email: 'multi-method-user@example.com' },
    update: {},
    create: {
      email: 'multi-method-user@example.com',
      name: 'Multi-Method 2FA User',
      password: twoFactorPassword,
      twoFactorEmailEnabled: true,
      twoFactorSmsEnabled: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Generate backup codes for multi-method user
  const multiBackupHashes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    multiBackupHashes.push(await hash(code, 12));
  }
  await prisma.user.update({
    where: { id: multiMethodUser.id },
    data: { backupCodes: JSON.stringify(multiBackupHashes) },
  });

  console.log('Created multi-method 2FA user:', multiMethodUser.email);

  // Create accounts
  const accountsData = [
    { name: 'Primary Checking', type: AccountType.CHECKING, balance: 5432.50, institution: 'Chase Bank' },
    { name: 'High-Yield Savings', type: AccountType.SAVINGS, balance: 15000.00, institution: 'Marcus' },
    { name: 'Rewards Credit Card', type: AccountType.CREDIT, balance: -1250.75, institution: 'American Express' },
    { name: 'Investment Portfolio', type: AccountType.INVESTMENT, balance: 45000.00, institution: 'Fidelity' },
  ];

  const accounts = [];
  for (const accountData of accountsData) {
    const account = await prisma.account.upsert({
      where: {
        id: `${user.id}-${accountData.name.replace(/\s+/g, '-').toLowerCase()}`,
      },
      update: accountData,
      create: {
        id: `${user.id}-${accountData.name.replace(/\s+/g, '-').toLowerCase()}`,
        userId: user.id,
        ...accountData,
        lastSynced: new Date(),
      },
    });
    accounts.push(account);
    console.log('Created account:', account.name);
  }

  // Delete existing transactions for clean seed
  await prisma.transaction.deleteMany({
    where: { userId: user.id },
  });

  // Create transactions for the past 90 days
  const transactions = [];
  const now = new Date();

  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const isIncome = Math.random() < 0.15;
    const isTransfer = !isIncome && Math.random() < 0.05;

    let category: string;
    let type: TransactionType;
    let amount: number;

    if (isIncome) {
      category = 'Income';
      type = TransactionType.INCOME;
      amount = Math.round((Math.random() * 4000 + 2000) * 100) / 100;
    } else if (isTransfer) {
      category = 'Transfer';
      type = TransactionType.TRANSFER;
      amount = Math.round((Math.random() * 500 + 100) * 100) / 100;
    } else {
      category = categories[Math.floor(Math.random() * categories.length)];
      type = TransactionType.EXPENSE;

      // Vary amounts by category
      switch (category) {
        case 'Bills & Utilities':
          amount = Math.round((Math.random() * 200 + 50) * 100) / 100;
          break;
        case 'Transportation':
          amount = Math.round((Math.random() * 100 + 20) * 100) / 100;
          break;
        case 'Travel':
          amount = Math.round((Math.random() * 500 + 100) * 100) / 100;
          break;
        case 'Healthcare':
          amount = Math.round((Math.random() * 200 + 25) * 100) / 100;
          break;
        default:
          amount = Math.round((Math.random() * 150 + 10) * 100) / 100;
      }
    }

    const categoryMerchants = merchants[category] || ['Unknown'];
    const merchant = categoryMerchants[Math.floor(Math.random() * categoryMerchants.length)];

    // Select account based on transaction type
    let account;
    if (type === TransactionType.INCOME) {
      account = accounts.find(a => a.type === AccountType.CHECKING) || accounts[0];
    } else if (type === TransactionType.EXPENSE) {
      // 30% chance to use credit card
      account = Math.random() < 0.3
        ? accounts.find(a => a.type === AccountType.CREDIT) || accounts[0]
        : accounts.find(a => a.type === AccountType.CHECKING) || accounts[0];
    } else {
      account = accounts.find(a => a.type === AccountType.SAVINGS) || accounts[0];
    }

    transactions.push({
      userId: user.id,
      accountId: account.id,
      amount,
      type,
      category,
      merchant,
      date,
    });
  }

  // Bulk insert transactions
  await prisma.transaction.createMany({
    data: transactions,
  });

  console.log(`Created ${transactions.length} transactions`);

  // Create savings goals
  const goalsData = [
    { name: 'Emergency Fund', targetAmount: 20000, currentAmount: 15000, deadline: new Date('2024-12-31') },
    { name: 'Vacation Fund', targetAmount: 5000, currentAmount: 2500, deadline: new Date('2024-06-01') },
    { name: 'New Car', targetAmount: 30000, currentAmount: 8000, deadline: new Date('2025-12-31') },
  ];

  for (const goalData of goalsData) {
    await prisma.savingsGoal.upsert({
      where: {
        id: `${user.id}-${goalData.name.replace(/\s+/g, '-').toLowerCase()}`,
      },
      update: goalData,
      create: {
        id: `${user.id}-${goalData.name.replace(/\s+/g, '-').toLowerCase()}`,
        userId: user.id,
        ...goalData,
      },
    });
    console.log('Created savings goal:', goalData.name);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
