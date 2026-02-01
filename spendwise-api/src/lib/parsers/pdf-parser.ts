import { PDFParse } from 'pdf-parse';
import type { ParsedStatement, ParsedTransaction, DetectedAccount } from './types';

// Common date patterns in bank statements
const DATE_REGEX = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;
const AMOUNT_REGEX = /\$?\s*-?[\d,]+\.\d{2}/g;

export async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedStatement> {
  const warnings: string[] = [];
  warnings.push('PDF parsing uses heuristic text extraction and may not capture all transactions accurately. Please review carefully.');

  let text: string;
  let parser: InstanceType<typeof PDFParse> | null = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text;
  } catch (err: any) {
    if (parser) await parser.destroy().catch(() => {});
    return {
      transactions: [],
      account: {},
      warnings: [`Failed to parse PDF: ${err.message}`],
    };
  }

  // Clean up pdfjs resources
  await parser.destroy().catch(() => {});

  if (!text || text.trim().length === 0) {
    return {
      transactions: [],
      account: {},
      warnings: ['PDF contains no extractable text. Scanned PDFs are not supported.'],
    };
  }

  const account = detectAccountFromText(text, fileName);
  const transactions = extractTransactionsFromText(text, warnings);

  if (transactions.length === 0) {
    warnings.push('Could not extract any transactions from the PDF. The format may not be supported.');
  }

  return { transactions, account, warnings };
}

function detectAccountFromText(text: string, _fileName: string): DetectedAccount {
  const account: DetectedAccount = {};

  // Only search the header area (first ~2000 chars) for institution and account type
  const headerText = text.slice(0, 2000);
  const headerLower = headerText.toLowerCase();

  const institutions: [string, string][] = [
    ['bank of america', 'Bank of America'],
    ['american express', 'American Express'],
    ['wells fargo', 'Wells Fargo'],
    ['capital one', 'Capital One'],
    ['td bank', 'TD Bank'],
    ['us bank', 'US Bank'],
    ['citibank', 'Citibank'],
    ['discover', 'Discover'],
    ['chase', 'Chase'],
    ['citi', 'Citibank'],
    ['usaa', 'USAA'],
    ['pnc', 'PNC'],
    ['ally', 'Ally'],
  ];

  for (const [key, name] of institutions) {
    if (headerLower.includes(key)) {
      account.institution = name;
      break;
    }
  }

  if (headerLower.includes('credit card') || headerLower.includes('card statement') || headerLower.includes('card account')) {
    account.accountType = 'CREDIT';
  } else if (/savings\b/i.test(headerLower)) {
    account.accountType = 'SAVINGS';
  } else if (/checking\b/i.test(headerLower)) {
    account.accountType = 'CHECKING';
  } else if (headerLower.includes('investment') || headerLower.includes('brokerage')) {
    account.accountType = 'INVESTMENT';
  }

  const acctMatch = text.match(/account\s*(?:number|#|no\.?)?\s*[:\s]*[*xX]{2,}(\d{4})/i) ||
    text.match(/account\s*(?:number|#|no\.?)?\s*[:\s]*\.{2,}(\d{4})/i) ||
    text.match(/(?:ending in|last four|xxxx)\s*(\d{4})/i);
  if (acctMatch) {
    account.accountMask = acctMatch[1];
  }

  return account;
}

// ── Transaction History Table Extraction ──
//
// Two-phase approach for column-based formats (e.g. Wells Fargo):
//   Phase 1: Extract raw transactions (unsigned amounts) and ending daily balances
//   Phase 2: Use balance arithmetic to determine deposit vs withdrawal for each transaction
//
// For section-based formats (separate Deposits/Withdrawals sections):
//   Uses sub-section headers to determine type directly

type TransactionType = 'INCOME' | 'EXPENSE';

// Markers that signal the START of the transaction history table
const TABLE_START_PATTERNS = [
  /\btransaction\s+history\b/i,
  /\btransaction\s+detail/i,
  /\baccount\s+activity\b/i,
  /\btransaction\s+activity\b/i,
  /\baccount\s+detail/i,
];

// Markers that signal the END of the transaction history table
const TABLE_END_PATTERNS = [
  /\bdaily\s+ending\s+balance\b/i,
  /\bbalance\s+summary\b/i,
  /\byear.to.date\s+summary/i,
  /\bworksheet\s+to\b/i,
  /\bcheck\s+images?\b/i,
  /\bimportant\s+(?:account\s+)?information\b/i,
  /\baccount\s+messages?\b/i,
  /\bdisclosures?\b/i,
  /\bterms\s+and\s+conditions\b/i,
  /\bsummary\s+of\s+checks?\b/i,
  /\bmonthly\s+service\s+fee\b/i,
  /\baccount\s+(?:transaction\s+)?fees?\s+summary\b/i,
  /\baccount\s+balance\s+calculation\b/i,
  /^\s*totals?\s/i,
];

// Sub-section headers and their types (for section-based formats only)
const SUB_SECTION_PATTERNS: [RegExp, TransactionType][] = [
  [/\bdeposits?\b.*\badditions?\b/i, 'INCOME'],
  [/\bdeposits?\b.*\bcredits?\b/i, 'INCOME'],
  [/\bcredits?\s+(?:and\s+)?additions?\b/i, 'INCOME'],
  [/\bother\s+credits?\b/i, 'INCOME'],
  [/\belectronic\s+deposits?\b/i, 'INCOME'],
  [/\bdeposits?\b/i, 'INCOME'],
  [/\binterest\s+(?:earned|paid)\b/i, 'INCOME'],
  [/\bpayments?\s+(?:and\s+)?(?:other\s+)?credits?\b/i, 'INCOME'],
  [/\bwithdrawals?\b.*\bsubtractions?\b/i, 'EXPENSE'],
  [/\bwithdrawals?\b.*\bdebits?\b/i, 'EXPENSE'],
  [/\bdebits?\s+(?:and\s+)?(?:other\s+)?subtractions?\b/i, 'EXPENSE'],
  [/\belectronic\s+(?:withdrawals?|payments?)\b/i, 'EXPENSE'],
  [/\bother\s+withdrawals?\b/i, 'EXPENSE'],
  [/\bwithdrawals?\b/i, 'EXPENSE'],
  [/\bpurchases?\b.*\badjustments?\b/i, 'EXPENSE'],
  [/\bpurchases?\b/i, 'EXPENSE'],
  [/\bchecks?\s+(?:paid|cleared|cashed)\b/i, 'EXPENSE'],
  [/\bservice\s+charges?\b/i, 'EXPENSE'],
  [/\bfees?\b/i, 'EXPENSE'],
];

const SKIP_LINE_PATTERNS = [
  /\bbeginning\s+balance\b/i,
  /\bending\s+balance\b/i,
  /\bopening\s+balance\b/i,
  /\bclosing\s+balance\b/i,
  /\bprevious\s+balance\b/i,
  /\bnew\s+balance\b/i,
  /\bbalance\s+forward\b/i,
  /\btotal\s+(?:deposits|withdrawals|credits|debits|charges|fees|interest)\b/i,
  /\boverdraft\s+protection\b/i,
];

function lineStartsWithDate(line: string): boolean {
  return /^\s*\d{1,2}\/\d{1,2}/.test(line);
}

function lineHasAmount(line: string): boolean {
  AMOUNT_REGEX.lastIndex = 0;
  const has = AMOUNT_REGEX.test(line);
  AMOUNT_REGEX.lastIndex = 0;
  return has;
}

function isLineAHeader(line: string): boolean {
  if (lineStartsWithDate(line)) return false;
  if (lineHasAmount(line)) return false;
  return true;
}

// Keyword-based fallback when balance-solving fails
function inferTypeFromDescription(description: string): TransactionType {
  const lower = description.toLowerCase();
  if (/\bdeposit/i.test(lower)) return 'INCOME';
  if (/\bdirect\s*dep/i.test(lower)) return 'INCOME';
  if (/\binterest\s+(?:earned|paid|payment)/i.test(lower)) return 'INCOME';
  if (/\brefund/i.test(lower)) return 'INCOME';
  if (/\bcash\s*back/i.test(lower)) return 'INCOME';
  return 'EXPENSE';
}

// Detect column-based format (has both Deposits and Withdrawals column headers)
function detectColumnFormat(lines: string[], startIdx: number): boolean {
  let hasDeposit = false;
  let hasWithdrawal = false;

  for (let i = startIdx; i < Math.min(startIdx + 15, lines.length); i++) {
    if (lineStartsWithDate(lines[i])) break;
    const lower = lines[i].toLowerCase();
    if (/\bdeposits?\b/i.test(lower)) hasDeposit = true;
    if (/\bwithdrawals?\b/i.test(lower) || /\bdebits?\b/i.test(lower)) hasWithdrawal = true;
  }

  return hasDeposit && hasWithdrawal;
}

// Extract beginning balance from statement header
function extractBeginningBalance(text: string): number | null {
  const match = text.match(/beginning\s+balance.*?\$?([\d,]+\.\d{2})/i);
  if (match) return parseFloat(match[1].replace(/,/g, ''));
  return null;
}

// ── Raw transaction (unsigned amount, before type assignment) ──
interface RawTransaction {
  date: Date;
  dateKey: string;          // "M/D" for grouping
  amount: number;           // unsigned
  description: string;
  endingBalance?: number;   // ending daily balance (only on last txn of the day)
}

// ── Balance-based sign solving ──
// Given unsigned amounts and the net balance change, find the +/- assignment
// that satisfies: sum(signed_amounts) = netChange
// Returns array of booleans: true = deposit (INCOME), false = withdrawal (EXPENSE)
function solveSignsForDay(amounts: number[], netChange: number): boolean[] | null {
  const n = amounts.length;
  if (n > 16) return null; // too many combinations

  for (let mask = 0; mask < (1 << n); mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (mask & (1 << i)) ? amounts[i] : -amounts[i];
    }
    if (Math.abs(sum - netChange) < 0.02) {
      const result: boolean[] = [];
      for (let i = 0; i < n; i++) {
        result.push(!!(mask & (1 << i)));
      }
      return result;
    }
  }
  return null;
}

// Assign types using balance arithmetic for column-format statements
function assignTypesFromBalance(
  rawTxns: RawTransaction[],
  beginningBalance: number | null,
  warnings: string[],
): ParsedTransaction[] {
  if (rawTxns.length === 0) return [];

  // Group by dateKey, preserving order
  const dayKeys: string[] = [];
  const dayGroups: Map<string, RawTransaction[]> = new Map();
  for (const txn of rawTxns) {
    if (!dayGroups.has(txn.dateKey)) {
      dayKeys.push(txn.dateKey);
      dayGroups.set(txn.dateKey, []);
    }
    dayGroups.get(txn.dateKey)!.push(txn);
  }

  const result: ParsedTransaction[] = [];
  let previousBalance = beginningBalance;

  for (const dateKey of dayKeys) {
    const dayTxns = dayGroups.get(dateKey)!;

    // Find the ending daily balance for this day (last txn with an endingBalance)
    let endingBalance: number | undefined;
    for (let i = dayTxns.length - 1; i >= 0; i--) {
      if (dayTxns[i].endingBalance !== undefined) {
        endingBalance = dayTxns[i].endingBalance;
        break;
      }
    }

    if (endingBalance !== undefined && previousBalance !== null) {
      const netChange = endingBalance - previousBalance;
      const amounts = dayTxns.map((t) => t.amount);
      const signs = solveSignsForDay(amounts, netChange);

      if (signs) {
        for (let i = 0; i < dayTxns.length; i++) {
          result.push({
            date: dayTxns[i].date,
            amount: dayTxns[i].amount,
            description: dayTxns[i].description,
            type: signs[i] ? 'INCOME' : 'EXPENSE',
          });
        }
        previousBalance = endingBalance;
        continue;
      } else {
        warnings.push(`Could not determine deposit/withdrawal for ${dateKey} using balance. Falling back to keyword inference.`);
      }
    }

    // Fallback: keyword-based inference
    for (const txn of dayTxns) {
      result.push({
        date: txn.date,
        amount: txn.amount,
        description: txn.description,
        type: inferTypeFromDescription(txn.description),
      });
    }

    if (endingBalance !== undefined) previousBalance = endingBalance;
  }

  return result;
}

function extractTransactionsFromText(text: string, warnings: string[]): ParsedTransaction[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // ── Step 1: Find where the transaction history table starts ──
  let tableStartIdx = -1;
  let foundExplicitStart = false;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (TABLE_START_PATTERNS.some((p) => p.test(lower))) {
      tableStartIdx = i + 1;
      foundExplicitStart = true;
      break;
    }
  }

  // Fallback: look for first sub-section header
  if (tableStartIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lineStartsWithDate(lines[i])) continue;
      const lower = lines[i].toLowerCase();
      for (const [pattern] of SUB_SECTION_PATTERNS) {
        if (pattern.test(lower)) {
          tableStartIdx = i;
          break;
        }
      }
      if (tableStartIdx !== -1) break;
    }
  }

  if (tableStartIdx === -1) tableStartIdx = 0;

  // ── Step 2: Detect format (column-based vs section-based) ──
  const isColumnFormat = foundExplicitStart && detectColumnFormat(lines, tableStartIdx);

  // ── Step 3: Detect statement year ──
  let currentYear = new Date().getFullYear();
  const yearMatch = text.match(/(?:statement\s+(?:period|date)|december|january|february|march|april|may|june|july|august|september|october|november).*?(\d{4})/i) ||
    text.match(/(\d{1,2}\/\d{1,2}\/(\d{4}))/);
  if (yearMatch) {
    const y = parseInt(yearMatch[2] || yearMatch[1]);
    if (y >= 2000 && y <= 2100) currentYear = y;
  }

  // ── Step 4: Walk through lines, collecting raw transactions ──
  let currentType: TransactionType = 'EXPENSE';

  // Pending multi-line transaction
  let pendingDate: Date | null = null;
  let pendingDateKey: string = '';
  let pendingDescription: string = '';

  // For column-format: collect raw transactions, then solve types via balance
  const rawTransactions: RawTransaction[] = [];
  // For section-format: build typed transactions directly
  const sectionTransactions: ParsedTransaction[] = [];

  function addTransaction(date: Date, dateKey: string, description: string, amounts: string[]) {
    if (amounts.length === 0) return;

    const firstAmount = parseFloat(amounts[0].replace(/[$,\s]/g, ''));
    if (isNaN(firstAmount) || firstAmount === 0) return;

    const desc = description.trim() || 'Transaction';

    if (isColumnFormat) {
      // For column format: store raw (unsigned) with ending balance if present
      const raw: RawTransaction = {
        date,
        dateKey,
        amount: Math.abs(firstAmount),
        description: desc,
      };
      // If there are 2+ amounts, the last is the ending daily balance
      if (amounts.length >= 2) {
        const lastAmount = parseFloat(amounts[amounts.length - 1].replace(/[$,\s]/g, ''));
        if (!isNaN(lastAmount)) {
          raw.endingBalance = lastAmount;
        }
      }
      rawTransactions.push(raw);
    } else {
      // Section format: use currentType directly
      sectionTransactions.push({
        date,
        amount: Math.abs(firstAmount),
        description: desc,
        type: currentType,
      });
    }
  }

  function flushPending(amountsOnLine: string[]) {
    if (!pendingDate) return;
    addTransaction(pendingDate, pendingDateKey, pendingDescription, amountsOnLine);
    pendingDate = null;
    pendingDescription = '';
    pendingDateKey = '';
  }

  for (let i = tableStartIdx; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check for table-end markers
    if (foundExplicitStart && TABLE_END_PATTERNS.some((p) => p.test(lower))) {
      pendingDate = null;
      break;
    }

    // Skip continued/page headers
    if (/\(continued\)/i.test(lower) || TABLE_START_PATTERNS.some((p) => p.test(lower))) continue;
    if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(line)) continue;
    if (/page\s+\d+\s+of\s+\d+/i.test(lower)) continue;

    // Check for sub-section headers
    if (isLineAHeader(line)) {
      if (!isColumnFormat) {
        for (const [pattern, type] of SUB_SECTION_PATTERNS) {
          if (pattern.test(lower)) {
            currentType = type;
            break;
          }
        }
      }
      // Header might be description continuation for pending transaction
      if (pendingDate && line.length < 80 && !SUB_SECTION_PATTERNS.some(([p]) => p.test(lower))) {
        pendingDescription += ' ' + line;
      }
      continue;
    }

    // Skip balance/total lines
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;

    // ── Try to parse as a transaction or continuation ──
    const dateMatch = line.match(DATE_REGEX);
    AMOUNT_REGEX.lastIndex = 0;
    const amounts = line.match(AMOUNT_REGEX);

    if (dateMatch && lineStartsWithDate(line)) {
      // New transaction line - discard any pending that never got an amount
      pendingDate = null;
      pendingDescription = '';
      pendingDateKey = '';

      // Parse date
      const dateParts = dateMatch[1].split('/');
      const month = parseInt(dateParts[0]) - 1;
      const day = parseInt(dateParts[1]);
      const year = dateParts[2]
        ? dateParts[2].length === 2
          ? 2000 + parseInt(dateParts[2])
          : parseInt(dateParts[2])
        : currentYear;

      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) continue;

      const dateKey = `${month + 1}/${day}`;

      if (amounts && amounts.length > 0) {
        // Single-line transaction: has date + description + amount(s)
        const dateEnd = (dateMatch.index || 0) + dateMatch[0].length;
        const firstAmountStart = line.indexOf(amounts[0]);
        let description = line.substring(dateEnd, firstAmountStart).trim();

        if (!description || description.length < 2) {
          const lastAmountStr = amounts[amounts.length - 1];
          const lastAmountEnd = line.lastIndexOf(lastAmountStr) + lastAmountStr.length;
          description = line.substring(lastAmountEnd).trim();
        }

        description = description.replace(/^\s*[-|<>]\s*/, '').trim();
        description = description.replace(/\s+#?\d{4,}$/, '').trim();
        if (!description || description.length < 2) description = 'Transaction';

        addTransaction(date, dateKey, description, amounts as unknown as string[]);
      } else {
        // Multi-line transaction: date + description, amount on next line
        const dateEnd = (dateMatch.index || 0) + dateMatch[0].length;
        pendingDate = date;
        pendingDateKey = dateKey;
        pendingDescription = line.substring(dateEnd).trim();
        pendingDescription = pendingDescription.replace(/^\s*[-|<>]\s*/, '').trim();
      }
    } else if (pendingDate && amounts && amounts.length > 0) {
      // Continuation line with amounts → completes the pending transaction
      const amountStart = line.indexOf(amounts[0]);
      const extraDesc = line.substring(0, amountStart).trim();
      if (extraDesc && extraDesc.length > 1) {
        pendingDescription += ' ' + extraDesc;
      }
      flushPending(amounts as unknown as string[]);
    } else if (pendingDate) {
      // Continuation line with no amount — append to pending description
      pendingDescription += ' ' + line;
    }
  }

  // ── Return results ──
  if (isColumnFormat) {
    const beginningBalance = extractBeginningBalance(text);
    return assignTypesFromBalance(rawTransactions, beginningBalance, warnings);
  }

  return sectionTransactions;
}
