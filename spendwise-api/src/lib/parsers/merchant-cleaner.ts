// POS terminal and payment processor prefixes to strip
const POS_PREFIXES = [
  'SQ *', 'SQC*', 'TST*', 'PP*', 'PAYPAL *', 'PAYPAL*',
  'SP *', 'SP*', 'CKE*', 'CHK*', 'POS ', 'DEBIT ',
  'PURCHASE ', 'CHECKCARD ', 'ACH ',
];

// Regex to strip trailing reference numbers, location info, and IDs
const TRAILING_PATTERNS = [
  /\s+#\d+$/i,                    // #12345
  /\s+\d{5,}$/,                   // long trailing numbers
  /\s+\d{2}\/\d{2}$/,             // MM/DD date suffix
  /\s+[A-Z]{2}\s+\d{5}(-\d{4})?$/,  // State + ZIP (CA 90210)
  /\s+[A-Z]{2}$/,                 // Trailing state code
  /\s+\d{3}-\d{3}-\d{4}$/,        // Phone numbers
  /\s+x{2,}\d{4}$/i,              // Card mask (xx1234)
  /\s+REF\s*#?\s*\w+$/i,          // REF #ABC123
  /\s+AUTH\s*#?\s*\w+$/i,         // AUTH #ABC123
];

// Known merchant aliases → clean display names
const KNOWN_MERCHANTS: Record<string, string> = {
  'amzn': 'Amazon',
  'amzn*marketplace': 'Amazon',
  'amzn*mktp': 'Amazon',
  'amazon.com': 'Amazon',
  'amazon prime': 'Amazon Prime',
  'wm supercenter': 'Walmart',
  'wal-mart': 'Walmart',
  'walmart': 'Walmart',
  'target': 'Target',
  'costco whse': 'Costco',
  'costco': 'Costco',
  'wholefds': 'Whole Foods',
  'whole foods': 'Whole Foods',
  'trader joe': 'Trader Joe\'s',
  'starbucks': 'Starbucks',
  'mcdonald': 'McDonald\'s',
  'chick-fil-a': 'Chick-fil-A',
  'chipotle': 'Chipotle',
  'uber eats': 'Uber Eats',
  'uber': 'Uber',
  'lyft': 'Lyft',
  'doordash': 'DoorDash',
  'grubhub': 'Grubhub',
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'apple.com/bill': 'Apple',
  'google *': 'Google',
  'venmo': 'Venmo',
  'zelle': 'Zelle',
};

interface CleanedMerchant {
  displayName: string;
  normalizedKey: string;
}

export function cleanMerchantName(raw: string): CleanedMerchant {
  if (!raw || !raw.trim()) {
    return { displayName: '', normalizedKey: '' };
  }

  let cleaned = raw.trim();

  // Strip POS prefixes
  for (const prefix of POS_PREFIXES) {
    if (cleaned.toUpperCase().startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }

  // Strip trailing patterns
  for (const pattern of TRAILING_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned.trim();
  if (!cleaned) {
    return { displayName: raw.trim(), normalizedKey: normalizeForKey(raw) };
  }

  // Check known merchants
  const lower = cleaned.toLowerCase();
  for (const [pattern, displayName] of Object.entries(KNOWN_MERCHANTS)) {
    if (lower.includes(pattern)) {
      return {
        displayName,
        normalizedKey: normalizeForKey(displayName),
      };
    }
  }

  // Title-case fallback
  const displayName = toTitleCase(cleaned);
  return {
    displayName,
    normalizedKey: normalizeForKey(cleaned),
  };
}

export function generateMerchantFingerprint(merchant: string): string {
  const { normalizedKey } = cleanMerchantName(merchant);
  return `merchant:cat:${normalizedKey}`;
}

function normalizeForKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
