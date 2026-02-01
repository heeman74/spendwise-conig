import Papa from 'papaparse';
import type { ParsedStatement, ParsedTransaction, DetectedAccount } from './types';

interface ColumnMapping {
  date: number;
  amount: number;
  description: number;
  debit?: number;
  credit?: number;
  category?: number;
  type?: number;
  checkNumber?: number;
  balance?: number;
}

const DATE_PATTERNS = [
  /date/i, /posted/i, /trans.*date/i, /transaction.*date/i, /posting.*date/i,
];
const AMOUNT_PATTERNS = [/^amount$/i, /transaction.*amount/i];
const DESCRIPTION_PATTERNS = [
  /description/i, /memo/i, /narrative/i, /details/i, /payee/i, /merchant/i, /name/i,
];
const DEBIT_PATTERNS = [/debit/i, /withdrawal/i, /charge/i];
const CREDIT_PATTERNS = [/credit/i, /deposit/i, /payment/i];
const CATEGORY_PATTERNS = [/category/i, /type/i, /class/i];
const CHECK_PATTERNS = [/check.*no/i, /check.*num/i, /check/i];

function detectColumns(headers: string[]): ColumnMapping | null {
  const findColumn = (patterns: RegExp[]): number => {
    for (const pattern of patterns) {
      const idx = headers.findIndex((h) => pattern.test(h.trim()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const date = findColumn(DATE_PATTERNS);
  const amount = findColumn(AMOUNT_PATTERNS);
  const description = findColumn(DESCRIPTION_PATTERNS);
  const debit = findColumn(DEBIT_PATTERNS);
  const credit = findColumn(CREDIT_PATTERNS);
  const category = findColumn(CATEGORY_PATTERNS);
  const checkNumber = findColumn(CHECK_PATTERNS);

  if (date === -1 || description === -1) return null;
  if (amount === -1 && (debit === -1 || credit === -1)) return null;

  return {
    date,
    amount,
    description,
    debit: debit !== -1 ? debit : undefined,
    credit: credit !== -1 ? credit : undefined,
    category: category !== -1 ? category : undefined,
    checkNumber: checkNumber !== -1 ? checkNumber : undefined,
  };
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const cleaned = value.trim();

  // MM/DD/YYYY or M/D/YYYY
  const usFormat = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usFormat) {
    const year = usFormat[3].length === 2 ? 2000 + parseInt(usFormat[3]) : parseInt(usFormat[3]);
    return new Date(year, parseInt(usFormat[1]) - 1, parseInt(usFormat[2]));
  }

  // YYYY-MM-DD
  const isoFormat = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoFormat) {
    return new Date(parseInt(isoFormat[1]), parseInt(isoFormat[2]) - 1, parseInt(isoFormat[3]));
  }

  // DD/MM/YYYY (try as fallback)
  const euFormat = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (euFormat) {
    const day = parseInt(euFormat[1]);
    const month = parseInt(euFormat[2]);
    if (day > 12) {
      return new Date(parseInt(euFormat[3]), month - 1, day);
    }
  }

  // Fallback to Date.parse
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value.trim().replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseCSV(buffer: Buffer, fileName: string): ParsedStatement {
  const content = buffer.toString('utf-8');
  const warnings: string[] = [];

  const result = Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0) {
    warnings.push(...result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`));
  }

  const rows = result.data as string[][];
  if (rows.length < 2) {
    return { transactions: [], account: {}, warnings: ['File contains no data rows'] };
  }

  const headers = rows[0];
  const mapping = detectColumns(headers);

  if (!mapping) {
    return {
      transactions: [],
      account: {},
      warnings: [
        'Could not detect column mapping. Expected columns: Date, Description, and either Amount or Debit/Credit.',
      ],
    };
  }

  const transactions: ParsedTransaction[] = [];
  let skippedRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => !c?.trim())) continue;

    const date = parseDate(row[mapping.date]);
    if (!date) {
      skippedRows++;
      continue;
    }

    let amount: number;
    if (mapping.amount !== -1 && mapping.amount !== undefined) {
      amount = parseAmount(row[mapping.amount]);
    } else {
      const debit = mapping.debit !== undefined ? parseAmount(row[mapping.debit]) : 0;
      const credit = mapping.credit !== undefined ? parseAmount(row[mapping.credit]) : 0;
      amount = credit > 0 ? credit : -Math.abs(debit);
    }

    if (amount === 0) {
      skippedRows++;
      continue;
    }

    const description = row[mapping.description]?.trim() || 'Unknown';
    const type = amount > 0 ? 'INCOME' : 'EXPENSE';

    const txn: ParsedTransaction = {
      date,
      amount: Math.abs(amount),
      description,
      type,
      checkNumber: mapping.checkNumber !== undefined ? row[mapping.checkNumber]?.trim() : undefined,
    };

    if (mapping.category !== undefined) {
      txn.category = row[mapping.category]?.trim();
    }

    transactions.push(txn);
  }

  if (skippedRows > 0) {
    warnings.push(`Skipped ${skippedRows} rows with missing or invalid data`);
  }

  // Try to detect account info from filename
  const account: DetectedAccount = detectAccountFromFileName(fileName);

  return { transactions, account, warnings };
}

function detectAccountFromFileName(fileName: string): DetectedAccount {
  const lower = fileName.toLowerCase();
  const account: DetectedAccount = {};

  // Detect account type from filename
  if (lower.includes('credit') || lower.includes('card')) {
    account.accountType = 'CREDIT';
  } else if (lower.includes('saving')) {
    account.accountType = 'SAVINGS';
  } else if (lower.includes('invest') || lower.includes('brokerage')) {
    account.accountType = 'INVESTMENT';
  } else if (lower.includes('check')) {
    account.accountType = 'CHECKING';
  }

  // Detect institution from filename
  const institutions = [
    'chase', 'bofa', 'bank of america', 'wells fargo', 'citi', 'citibank',
    'capital one', 'discover', 'amex', 'american express', 'usaa', 'schwab',
    'fidelity', 'vanguard', 'td bank', 'pnc', 'us bank', 'ally',
  ];
  for (const inst of institutions) {
    if (lower.includes(inst)) {
      account.institution = inst.charAt(0).toUpperCase() + inst.slice(1);
      break;
    }
  }

  // Detect account mask (last 4 digits in filename)
  const maskMatch = fileName.match(/(\d{4})(?=\D*\.[^.]+$)/);
  if (maskMatch) {
    account.accountMask = maskMatch[1];
  }

  return account;
}
