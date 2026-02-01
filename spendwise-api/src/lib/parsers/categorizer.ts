import type { ParsedTransaction } from './types';

// Category keywords - keys must match VALID_CATEGORIES from ../constants
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'restaurant', 'mcdonald', 'starbucks', 'chipotle', 'subway', 'pizza',
    'burger', 'taco', 'sushi', 'coffee', 'cafe', 'diner', 'grubhub',
    'doordash', 'uber eats', 'postmates', 'seamless', 'panera', 'dunkin',
    'wendy', 'chick-fil-a', 'popeyes', 'domino', 'panda express',
    'five guys', 'olive garden', 'applebee', 'ihop', 'waffle',
  ],
  'Groceries': [
    'grocery', 'supermarket', 'whole foods', 'trader joe', 'walmart',
    'target', 'costco', 'kroger', 'safeway', 'publix', 'aldi',
    'wegmans', 'market', 'h-e-b', 'food lion', 'stop & shop',
    'sprouts', 'fresh market', 'giant', 'piggly wiggly',
  ],
  'Shopping': [
    'amazon', 'ebay', 'walmart.com', 'target.com', 'best buy', 'apple',
    'nike', 'adidas', 'zara', 'h&m', 'nordstrom', 'macy', 'gap',
    'old navy', 'ikea', 'home depot', 'lowe', 'wayfair', 'etsy',
    'shopify', 'store', 'shop', 'mall', 'retail',
  ],
  'Transportation': [
    'uber', 'lyft', 'taxi', 'gas', 'shell', 'chevron', 'exxon',
    'bp', 'sunoco', 'fuel', 'parking', 'toll', 'transit', 'metro',
    'bus', 'train', 'amtrak', 'airline', 'flight', 'car wash',
    'auto', 'mechanic', 'tire', 'jiffy lube',
  ],
  'Bills & Utilities': [
    'electric', 'water', 'gas bill', 'internet', 'cable', 'phone',
    'verizon', 'at&t', 'tmobile', 't-mobile', 'sprint', 'comcast',
    'xfinity', 'spectrum', 'utility', 'sewage', 'trash', 'waste',
    'insurance', 'geico', 'state farm', 'allstate', 'progressive',
    'rent', 'mortgage', 'hoa', 'property tax',
  ],
  'Entertainment': [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'youtube',
    'apple tv', 'paramount', 'peacock', 'movie', 'theater', 'cinema',
    'concert', 'ticket', 'ticketmaster', 'stubhub', 'gaming',
    'steam', 'playstation', 'xbox', 'nintendo', 'twitch',
  ],
  'Healthcare': [
    'pharmacy', 'cvs', 'walgreens', 'rite aid', 'hospital', 'doctor',
    'dental', 'dentist', 'optometrist', 'vision', 'medical',
    'health', 'urgent care', 'clinic', 'lab', 'prescription',
    'therapy', 'physical therapy', 'chiropractic',
  ],
  'Travel': [
    'hotel', 'motel', 'airbnb', 'vrbo', 'booking.com', 'expedia',
    'kayak', 'priceline', 'marriott', 'hilton', 'hyatt', 'resort',
    'cruise', 'rental car', 'hertz', 'avis', 'enterprise',
    'airport', 'tsa', 'luggage',
  ],
  'Education': [
    'tuition', 'university', 'college', 'school', 'textbook',
    'coursera', 'udemy', 'skillshare', 'masterclass', 'student loan',
    'education', 'learning', 'tutoring', 'library',
  ],
  'Personal Care': [
    'salon', 'barber', 'spa', 'massage', 'nail', 'beauty',
    'sephora', 'ulta', 'haircut', 'grooming', 'skincare', 'gym',
    'fitness', 'planet fitness', 'equinox', 'yoga', 'peloton',
  ],
  'Income': [
    'payroll', 'direct deposit', 'salary', 'wage', 'payment received',
    'interest earned', 'dividend', 'refund', 'reimbursement',
    'cash back', 'rebate', 'bonus',
  ],
  'Transfer': [
    'transfer', 'zelle', 'venmo', 'paypal', 'cash app', 'wire',
    'ach', 'internal transfer',
  ],
};

export interface CategorizationResult {
  category: string;
  confidence: number; // 0-100
}

export function categorizeTransaction(transaction: ParsedTransaction): string {
  return categorizeTransactionWithConfidence(transaction).category;
}

export function categorizeTransactionWithConfidence(transaction: ParsedTransaction): CategorizationResult {
  // If already categorized, keep it with high confidence
  if (transaction.category) return { category: transaction.category, confidence: 80 };

  const text = [
    transaction.description,
    transaction.merchant,
    transaction.memo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Score each category
  let bestCategory = 'Other';
  let bestScore = 0;
  let matchCount = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    let hits = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Longer keywords get higher scores (more specific match)
        score += keyword.length;
        hits++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      matchCount = hits;
    }
  }

  // Use income type hint
  if (bestCategory === 'Other' && transaction.type === 'INCOME') {
    bestCategory = 'Income';
    return { category: bestCategory, confidence: 65 };
  }

  if (bestCategory === 'Other') {
    return { category: 'Other', confidence: 20 };
  }

  // Confidence based on match strength:
  // - Single short keyword match: ~55
  // - Multiple matches or long keyword: ~70-85
  const confidence = Math.min(85, 45 + matchCount * 10 + Math.min(bestScore, 30));

  return { category: bestCategory, confidence };
}

export function categorizeTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  return transactions.map((txn) => ({
    ...txn,
    category: categorizeTransaction(txn),
  }));
}
