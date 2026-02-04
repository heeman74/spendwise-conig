import { parseCSV } from './csv-parser';
import { parseOFX } from './ofx-parser';
import { parsePDF } from './pdf-parser';
import { categorizeTransactions } from './categorizer';
import { categorizeTransactionsAI } from '../ai';
import { detectDuplicates } from './dedup';
import { matchAccount } from './account-matcher';
import { ensureUserCategoriesSeeded } from '../constants';
import type { ParsedStatement, ImportPreviewData } from './types';

const PREVIEW_TTL = 3600; // 1 hour cache for preview data

export async function processStatementUpload(
  prisma: any,
  redis: any,
  userId: string,
  importId: string,
  fileBuffer: Buffer,
  fileName: string,
  fileFormat: string
): Promise<void> {
  try {
    // Update status to PARSING
    await prisma.statementImport.update({
      where: { id: importId },
      data: { status: 'PARSING' },
    });

    // Parse based on format
    let parsed: ParsedStatement;
    switch (fileFormat) {
      case 'CSV':
        parsed = parseCSV(fileBuffer, fileName);
        break;
      case 'OFX':
      case 'QFX':
        parsed = await parseOFX(fileBuffer);
        break;
      case 'PDF':
        parsed = await parsePDF(fileBuffer, fileName);
        break;
      default:
        throw new Error(`Unsupported format: ${fileFormat}`);
    }

    if (parsed.transactions.length === 0) {
      await prisma.statementImport.update({
        where: { id: importId },
        data: {
          status: 'ERROR',
          errorMessage: parsed.warnings.length > 0
            ? parsed.warnings.join('; ')
            : 'No transactions found in statement',
        },
      });
      return;
    }

    // Ensure user categories are seeded before categorization
    await ensureUserCategoriesSeeded(prisma, userId);

    // Auto-categorize (AI with keyword fallback)
    let categorized;
    try {
      categorized = await categorizeTransactionsAI(prisma, userId, parsed.transactions);
    } catch (error) {
      console.error('AI categorization failed, using keyword fallback:', error);
      categorized = categorizeTransactions(parsed.transactions);
    }

    // Match account
    const matchedAccount = await matchAccount(prisma, userId, parsed.account);

    // Detect duplicates
    const withDuplicates = await detectDuplicates(
      prisma,
      userId,
      categorized,
      matchedAccount?.id
    );

    const duplicateCount = withDuplicates.filter((t) => t.isDuplicate).length;

    // Build preview data
    const previewData: ImportPreviewData = {
      importId,
      fileName,
      fileFormat,
      account: parsed.account,
      transactions: withDuplicates,
      totalTransactions: withDuplicates.length,
      duplicateCount,
      warnings: parsed.warnings,
    };

    // Cache preview data in Redis
    await redis.setex(
      `import:preview:${importId}`,
      PREVIEW_TTL,
      JSON.stringify(previewData, (key, value) => {
        // Serialize dates
        if (value instanceof Date) return value.toISOString();
        return value;
      })
    );

    // Update StatementImport record
    await prisma.statementImport.update({
      where: { id: importId },
      data: {
        status: 'PREVIEW',
        accountId: matchedAccount?.id || null,
        detectedInstitution: parsed.account.institution || null,
        detectedAccountType: parsed.account.accountType || null,
        detectedAccountName: parsed.account.accountName || null,
        detectedAccountMask: parsed.account.accountMask || null,
        transactionsFound: withDuplicates.length,
        duplicatesSkipped: duplicateCount,
      },
    });
  } catch (error: any) {
    console.error('Statement processing error:', error);
    await prisma.statementImport.update({
      where: { id: importId },
      data: {
        status: 'ERROR',
        errorMessage: error.message || 'Failed to process statement',
      },
    });
  }
}
