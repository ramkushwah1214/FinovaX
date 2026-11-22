import { ParsedRawRecord, ParserResult } from './types';
import { extractPdfText } from './bankPdfParser';
import { parseCleanAmount, parseFlexibleDate } from './csvParser';

export const GPAY_LIMITATIONS_DISCLOSURE = [
  'Account Balances: Google Pay statements record UPI payment transactions only and do not contain bank account balances.',
  'Account Number Masking: Beneficiary account numbers and IFSC details may be partially masked by Google Pay for user privacy.',
  'UPI Reference Verification: All transactions are indexed with a 12-digit UPI Transaction Reference Number (UTR) where provided.',
  'Transaction Scope: Statement captures peer-to-peer (P2P), peer-to-merchant (P2M), and bill payments processed via Google Pay UPI.'
];

/**
 * Extracts 12-digit UPI reference ID from text candidate
 */
export function extractUpiReferenceId(text: string): string {
  // UPI transaction references are typically exactly 12 digits
  const match = text.match(/\b\d{12}\b/);
  if (match) return match[0];

  // Some UPI statements provide 10-14 digit alphanumeric/numeric refs
  const broadMatch = text.match(/(?:UPI|UTR|Ref|Txn)\s*(?:No|ID|Ref)?[:\s#]*([A-Za-z0-9]{10,16})/i);
  if (broadMatch && broadMatch[1]) return broadMatch[1];

  return '';
}

/**
 * Dedicated Google Pay PDF statement parser
 */
export async function parseGooglePayPdfBuffer(buffer: Buffer): Promise<ParserResult> {
  const text = await extractPdfText(buffer);
  if (!text || text.trim().length === 0) {
    throw new Error('Google Pay PDF contains no extractable text layer.');
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const records: ParsedRawRecord[] = [];

  // Approach 1: Multi-line transaction card parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let direction: 'debit' | 'credit' = 'debit';
    let entity = '';
    let isGpayTxn = false;

    if (/^(paid to|payment to)\s+/i.test(line)) {
      direction = 'debit';
      entity = line.replace(/^(paid to|payment to)\s+/i, '').trim();
      isGpayTxn = true;
    } else if (/^(received from|payment from)\s+/i.test(line)) {
      direction = 'credit';
      entity = line.replace(/^(received from|payment from)\s+/i, '').trim();
      isGpayTxn = true;
    }

    if (isGpayTxn) {
      let amount = 0;
      let date: Date | null = null;
      let refId = '';

      // Look in next 8 lines for details
      for (let j = 1; j <= 8 && (i + j) < lines.length; j++) {
        const sub = lines[i + j];

        // 1. Amount: look for ₹ or decimal number
        if (amount === 0 && (sub.includes('₹') || /^\d+[.,]\d{2}$/.test(sub.replace(/[₹\s,]/g, '')))) {
          const parsed = parseCleanAmount(sub);
          if (parsed.amount > 0) amount = parsed.amount;
        }

        // 2. UPI Reference ID
        if (!refId) {
          const upiCandidate = extractUpiReferenceId(sub);
          if (upiCandidate) refId = upiCandidate;
        }

        // 3. Date & Time
        if (!date) {
          const parsedDate = parseFlexibleDate(sub);
          if (parsedDate) date = parsedDate;
        }
      }

      if (amount > 0) {
        records.push({
          date: date || new Date(),
          description: `${direction === 'debit' ? 'GPay to' : 'GPay from'} ${entity || 'Merchant'}`,
          amount,
          direction,
          referenceId: refId,
          merchant: entity || 'UPI Merchant',
          paymentMethod: 'Google Pay (UPI)'
        });
      }
    }
  }

  // Approach 2: Compact line-by-line format fallback
  if (records.length === 0) {
    const lineRegex = /(Paid to|Received from)\s+(.+?)\s+₹?\s*([0-9,]+\.?\d*)/i;
    for (const line of lines) {
      const match = line.match(lineRegex);
      if (match) {
        const dirStr = match[1].toLowerCase();
        const entity = match[2].trim();
        const parsedAmt = parseCleanAmount(match[3]).amount;
        const refId = extractUpiReferenceId(line);

        if (parsedAmt > 0) {
          records.push({
            date: new Date(),
            description: `GPay: ${entity}`,
            amount: parsedAmt,
            direction: dirStr.includes('received') ? 'credit' : 'debit',
            referenceId: refId,
            merchant: entity,
            paymentMethod: 'Google Pay (UPI)'
          });
        }
      }
    }
  }

  return {
    records,
    unparsedRows: [],
    bankDetected: 'Google Pay (UPI)',
    totalParsed: records.length,
    totalFailed: 0
  };
}

