/**
 * FinovaX Statement Processing & Parsing Service Bridge
 * Maintains backward compatibility while delegating to modular services in ./statement/
 */
import mongoose from 'mongoose';
import { IStagedTransaction, StatementFileType } from '../models/StatementImport';
import { ParsedRawRecord } from './statement/types';
import { parseCsvBuffer, parseCleanAmount, parseFlexibleDate } from './statement/csvParser';
import { parseExcelBuffer } from './statement/excelParser';
import { parseBankPdfBuffer, extractPdfText } from './statement/bankPdfParser';
import { parseGooglePayPdfBuffer } from './statement/googlePayPdfParser';
import { extractCleanMerchant, normalizeRawRecord } from './statement/transactionNormalizer';
import { categorizeTransactionWithRules } from './statement/categorizationService';
import { detectDuplicatesMultiTier } from './statement/duplicateDetectionService';

export { ParsedRawRecord } from './statement/types';
export { parseCleanAmount, parseFlexibleDate } from './statement/csvParser';
export { extractCleanMerchant } from './statement/transactionNormalizer';

// Canonical Categories according to prompt
export const CATEGORY_DEFINITIONS = {
  INCOME: ['Salary', 'Business Income', 'Interest', 'Other Income'],
  EXPENSES: [
    'Food', 'Groceries', 'Shopping', 'Travel', 'Fuel', 'Bills',
    'Healthcare', 'Education', 'Rent', 'Entertainment', 'Subscriptions',
    'Loan Payments', 'Investments', 'Other Expenses'
  ],
  OTHER: ['Bank Transfer', 'Own Account Transfer', 'Refund', 'Cash Withdrawal', 'ATM', 'UPI', 'Other']
};

export function categorizeTransaction(
  description: string,
  amount: number,
  direction: 'debit' | 'credit'
) {
  return categorizeTransactionWithRules(description, amount, direction);
}

export function extractMerchant(description: string): string {
  return extractCleanMerchant(description);
}

export function parseDateFlexible(val: any): Date {
  const d = parseFlexibleDate(val);
  return d || new Date();
}

export function parseAmount(val: any): number {
  return parseCleanAmount(val).amount;
}

export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  fileType: 'csv' | 'xlsx'
): Promise<ParsedRawRecord[]> {
  if (fileType === 'csv') {
    const res = parseCsvBuffer(buffer);
    return res.records;
  }
  const res = parseExcelBuffer(buffer);
  return res.records;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedRawRecord[]> {
  const res = await parseBankPdfBuffer(buffer);
  return res.records;
}

export async function parseGooglePayPdfBufferLegacy(buffer: Buffer): Promise<ParsedRawRecord[]> {
  const res = await parseGooglePayPdfBuffer(buffer);
  return res.records;
}

export { parseGooglePayPdfBuffer } from './statement/googlePayPdfParser';

export async function detectDuplicates(
  userId: mongoose.Types.ObjectId,
  rawRecords: ParsedRawRecord[]
): Promise<IStagedTransaction[]> {
  const stagedInitial = rawRecords.map((raw, idx) => {
    const cat = categorizeTransactionWithRules(raw.description, raw.amount, raw.direction);
    return normalizeRawRecord(raw, idx, cat);
  });

  const res = await detectDuplicatesMultiTier(userId, stagedInitial);
  return res.stagedTransactions;
}
