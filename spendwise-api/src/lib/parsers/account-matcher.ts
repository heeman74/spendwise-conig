import type { DetectedAccount } from './types';

interface MatchedAccount {
  id: string;
  name: string;
  type: string;
  institution: string;
  mask: string | null;
}

export async function matchAccount(
  prisma: any,
  userId: string,
  detected: DetectedAccount
): Promise<MatchedAccount | null> {
  if (!detected.institution && !detected.accountMask) return null;

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      institution: true,
      mask: true,
    },
  });

  if (accounts.length === 0) return null;

  // Score-based matching
  let bestMatch: MatchedAccount | null = null;
  let bestScore = 0;

  for (const account of accounts) {
    let score = 0;

    // Mask match (strongest signal)
    if (detected.accountMask && account.mask) {
      if (detected.accountMask === account.mask) {
        score += 10;
      }
    }

    // Institution match
    if (detected.institution && account.institution) {
      if (account.institution.toLowerCase().includes(detected.institution.toLowerCase()) ||
          detected.institution.toLowerCase().includes(account.institution.toLowerCase())) {
        score += 5;
      }
    }

    // Account type match
    if (detected.accountType && account.type === detected.accountType) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = account as MatchedAccount;
    }
  }

  // Require minimum score of 5 (at least institution match)
  return bestScore >= 5 ? bestMatch : null;
}
