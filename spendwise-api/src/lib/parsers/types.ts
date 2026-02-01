export interface ParsedTransaction {
  date: Date;
  amount: number;
  description: string;
  merchant?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: string;
  fitId?: string; // OFX Financial Institution Transaction ID for dedup
  checkNumber?: string;
  memo?: string;
}

export interface DetectedAccount {
  institution?: string;
  accountType?: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT';
  accountName?: string;
  accountMask?: string; // Last 4 digits
}

export interface ParsedStatement {
  transactions: ParsedTransaction[];
  account: DetectedAccount;
  warnings: string[];
}

export interface ImportPreviewData {
  importId: string;
  fileName: string;
  fileFormat: string;
  account: DetectedAccount;
  transactions: PreviewTransaction[];
  totalTransactions: number;
  duplicateCount: number;
  warnings: string[];
}

export interface PreviewTransaction extends ParsedTransaction {
  isDuplicate: boolean;
  suggestedCategory: string;
  duplicateOf?: string; // ID of existing transaction
  categoryConfidence: number;  // 0-100
  categorySource: string;      // "ai" | "rule" | "keyword" | "cache"
  cleanedMerchant: string;     // Display name
}
