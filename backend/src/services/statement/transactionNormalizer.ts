import { ParsedRawRecord } from './types';
import { IStagedTransaction } from '../../models/StatementImport';

/**
 * Extracts a clean merchant / entity name from transaction narrations
 */
export function extractCleanMerchant(description: string): string {
  if (!description) return 'General Merchant';

  // 1. UPI formatting: e.g. "UPI/412345678901/SWIGGY/swiggy@icici/UPI" -> "SWIGGY"
  const upiMatch = description.match(/UPI\/\d+\/([^/]+)/i);
  if (upiMatch && upiMatch[1]) {
    const rawName = upiMatch[1].replace(/[-_]/g, ' ').trim();
    return formatTitleCase(rawName);
  }

  // 2. POS formatting: "POS 43210987 STARBUCKS BANGALORE" -> "STARBUCKS BANGALORE"
  const posMatch = description.match(/POS\s+\d+\s+([A-Za-z\s]+)/i);
  if (posMatch && posMatch[1]) {
    return formatTitleCase(posMatch[1].trim().slice(0, 32));
  }

  // 3. NEFT/IMPS/RTGS: "NEFT-AXIS001-JOHN DOE-REF123" -> "JOHN DOE"
  const trfMatch = description.match(/(?:NEFT|IMPS|RTGS)[-_]([^-]+)[-_]([^-]+)/i);
  if (trfMatch && trfMatch[2]) {
    return formatTitleCase(trfMatch[2].trim().slice(0, 32));
  }

  // 4. ATM Cash:
  if (/atm\s*(wdl|cash|withdrawal)/i.test(description)) {
    return 'ATM Cash Withdrawal';
  }

  // 5. GPay prefixes
  if (/^GPay(?:\s+to|\s+from)?:\s*(.+)$/i.test(description)) {
    const candidate = description.replace(/^GPay(?:\s+to|\s+from)?:\s*/i, '').trim();
    return formatTitleCase(candidate.slice(0, 32));
  }

  // Fallback: take first sensible token
  const tokens = description.split(/[-–—/|:;]/);
  const first = (tokens[0] || description).trim();
  const cleaned = first.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return formatTitleCase(cleaned.length > 32 ? cleaned.slice(0, 29) + '...' : cleaned || 'Bank Transaction');
}

function formatTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface NormalizationOptions {
  source?: 'bank_statement' | 'gpay';
  defaultCurrency?: string;
  defaultPaymentMethod?: string;
}

/**
 * Normalizes a raw parsed financial record into an IStagedTransaction adhering to accounting rules
 */
export function normalizeRawRecord(
  raw: ParsedRawRecord,
  index: number,
  categoryResult: {
    category: string;
    subcategory?: string;
    transactionType: string;
    confidence: number;
    source: 'ml' | 'rule_based' | 'default';
  },
  options: NormalizationOptions = {}
): IStagedTransaction {
  const merchant = raw.merchant || extractCleanMerchant(raw.description);
  const desc = (raw.description || '').toLowerCase();

  // Accounting Rules Verification
  let transactionType = categoryResult.transactionType || (raw.direction === 'credit' ? 'income' : 'expense');
  let type: 'income' | 'expense' = raw.direction === 'credit' ? 'income' : 'expense';

  // Rule 1: Own-account transfers MUST NOT be counted as income or expense
  if (
    transactionType === 'transfer' ||
    desc.includes('self transfer') ||
    desc.includes('own acc') ||
    desc.includes('trf to self') ||
    desc.includes('to self')
  ) {
    transactionType = 'transfer';
  }

  // Rule 2: Refunds MUST NOT be treated as new income
  if (
    transactionType === 'refund' ||
    desc.includes('refund') ||
    desc.includes('reversal') ||
    desc.includes('cashback')
  ) {
    transactionType = 'refund';
  }

  return {
    id: `staged_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    date: raw.date instanceof Date && !isNaN(raw.date.getTime()) ? raw.date : new Date(),
    title: merchant,
    merchant,
    amount: Math.max(0, Math.abs(raw.amount || 0)),
    currency: options.defaultCurrency || 'INR',
    type,
    direction: raw.direction,
    transactionType,
    category: categoryResult.category,
    subcategory: categoryResult.subcategory || '',
    referenceId: raw.referenceId ? String(raw.referenceId).trim() : '',
    balance: raw.balance !== undefined ? Math.abs(raw.balance) : undefined,
    paymentMethod: raw.paymentMethod || options.defaultPaymentMethod || 'Statement Import',
    isDuplicate: false,
    duplicateReason: '',
    existingTransactionId: '',
    categorizationConfidence: categoryResult.confidence,
    categorizationSource: categoryResult.source,
    description: raw.description,
    userExcluded: false
  };
}

