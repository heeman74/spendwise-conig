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

/**
 * Extract a stable "company name" pattern from a raw transaction description.
 * Strips POS prefixes, checks known merchants, then walks tokens stopping at
 * the first purely-numeric token with 6+ digits. Returns a normalized key of
 * the leading meaningful words, or '' if the result is too short (< 3 chars).
 *
 * Examples:
 *   "Prudential Payments 251117 824436798310054 Hee Chung" → "prudentialpayments"
 *   "AMZN MKTP US*AB1CD2EF3" → "amazon"
 *   "SQ *BLUE BOTTLE COFFEE" → "bluebottlecoffee"
 *   "7-ELEVEN STORE #1234"   → "7elevenstore"
 */
export function extractDescriptionPattern(raw: string): string {
  if (!raw || !raw.trim()) return '';

  let cleaned = raw.trim();

  // Strip POS prefixes
  for (const prefix of POS_PREFIXES) {
    if (cleaned.toUpperCase().startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }

  if (!cleaned) return '';

  // Check known merchants first
  const lower = cleaned.toLowerCase();
  for (const [pattern, displayName] of Object.entries(KNOWN_MERCHANTS)) {
    if (lower.includes(pattern)) {
      return normalizeForKey(displayName);
    }
  }

  // Strip # characters (store numbers like #1234)
  cleaned = cleaned.replace(/#/g, '');

  // Split into tokens, keep only leading meaningful words
  const tokens = cleaned.split(/\s+/);
  const meaningful: string[] = [];

  for (const token of tokens) {
    // Stop at the first purely-numeric token with 6+ digits
    const digitsOnly = token.replace(/[^0-9]/g, '');
    if (/^\d+$/.test(token) && digitsOnly.length >= 6) {
      break;
    }
    meaningful.push(token);
  }

  const pattern = normalizeForKey(meaningful.join(' '));
  return pattern.length >= 3 ? pattern : '';
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
