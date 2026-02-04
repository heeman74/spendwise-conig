import { Ofx } from 'ofx-js';
import type { ParsedStatement, ParsedTransaction, DetectedAccount } from './types';

export async function parseOFX(buffer: Buffer): Promise<ParsedStatement> {
  const content = buffer.toString('utf-8');
  const warnings: string[] = [];

  let ofxData: any;
  try {
    ofxData = await Ofx.parse(content);
  } catch (err: any) {
    return {
      transactions: [],
      account: {},
      warnings: [`Failed to parse OFX file: ${err.message}`],
    };
  }

  const account: DetectedAccount = {};
  const transactions: ParsedTransaction[] = [];

  // Navigate OFX structure - handle both bank and credit card statements
  const signOnResponse = ofxData?.OFX?.SIGNONMSGSRSV1?.SONRS;
  const bankResponse = ofxData?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
  const creditResponse = ofxData?.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;
  const investResponse = ofxData?.OFX?.INVSTMTMSGSRSV1?.INVSTMTTRNRS?.INVSTMTRS;

  const stmtResponse = bankResponse || creditResponse || investResponse;

  if (!stmtResponse) {
    return {
      transactions: [],
      account: {},
      warnings: ['No statement data found in OFX file'],
    };
  }

  // Extract institution info
  const fiOrg = signOnResponse?.FI?.ORG;
  if (fiOrg) {
    account.institution = fiOrg;
  }

  // Extract account info
  if (bankResponse) {
    const acctFrom = bankResponse.BANKACCTFROM;
    if (acctFrom) {
      account.accountMask = acctFrom.ACCTID?.slice(-4);
      const acctType = acctFrom.ACCTTYPE?.toUpperCase();
      if (acctType === 'CHECKING') account.accountType = 'CHECKING';
      else if (acctType === 'SAVINGS') account.accountType = 'SAVINGS';
    }
  } else if (creditResponse) {
    const acctFrom = creditResponse.CCACCTFROM;
    if (acctFrom) {
      account.accountMask = acctFrom.ACCTID?.slice(-4);
      account.accountType = 'CREDIT';
    }
  } else if (investResponse) {
    account.accountType = 'INVESTMENT';
    const acctFrom = investResponse.INVACCTFROM;
    if (acctFrom) {
      account.accountMask = acctFrom.ACCTID?.slice(-4);
    }
  }

  // Build a descriptive account name from institution + type + mask
  const typeLabel: Record<string, string> = {
    CHECKING: 'Checking',
    SAVINGS: 'Savings',
    CREDIT: 'Credit Card',
    INVESTMENT: 'Investment',
  };
  const nameParts: string[] = [];
  if (account.institution) nameParts.push(account.institution);
  if (account.accountType) nameParts.push(typeLabel[account.accountType] || account.accountType);
  if (account.accountMask) nameParts.push(`···${account.accountMask}`);
  if (nameParts.length > 0) account.accountName = nameParts.join(' ');

  // Extract transactions
  const tranList = stmtResponse.BANKTRANLIST || stmtResponse.INVTRANLIST;
  if (!tranList) {
    warnings.push('No transaction list found in statement');
    return { transactions, account, warnings };
  }

  // OFX transactions can be STMTTRN (bank/cc) or various investment types
  const stmtTrns = Array.isArray(tranList.STMTTRN)
    ? tranList.STMTTRN
    : tranList.STMTTRN
      ? [tranList.STMTTRN]
      : [];

  for (const trn of stmtTrns) {
    const date = parseOFXDate(trn.DTPOSTED);
    if (!date) {
      warnings.push(`Skipped transaction with invalid date: ${trn.DTPOSTED}`);
      continue;
    }

    const amount = parseFloat(trn.TRNAMT);
    if (isNaN(amount) || amount === 0) continue;

    const description = trn.NAME || trn.MEMO || 'Unknown';
    const type = amount > 0 ? 'INCOME' : 'EXPENSE';

    transactions.push({
      date,
      amount: Math.abs(amount),
      description: description.trim(),
      merchant: trn.NAME?.trim(),
      type,
      fitId: trn.FITID,
      checkNumber: trn.CHECKNUM,
      memo: trn.MEMO?.trim(),
    });
  }

  if (transactions.length === 0) {
    warnings.push('No transactions could be extracted from the statement');
  }

  return { transactions, account, warnings };
}

function parseOFXDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // OFX dates: YYYYMMDDHHMMSS or YYYYMMDD
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  const day = parseInt(match[3]);

  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}
