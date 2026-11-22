import { ParsedRawRecord, ParserResult, UnparsedRow } from './types';

/**
 * Standard CSV line parser supporting quoted fields with embedded commas and quotes (RFC 4180 compliant)
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote ("")
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Cleans Indian & International currency numbers:
 * "₹ 1,50,000.50" -> 150000.50
 * " (1,200.00) " -> 1200.00
 */
export function parseCleanAmount(val: any): { amount: number; isNegative: boolean } {
  if (typeof val === 'number') {
    return { amount: Math.abs(val), isNegative: val < 0 };
  }
  if (!val) return { amount: 0, isNegative: false };

  let str = String(val).trim();
  let isNegative = false;

  // Handle accounting brackets: "(1,500.00)"
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove currency signs (₹, $, €, £), commas, spaces
  const cleaned = str.replace(/[₹$€£,\s]/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return { amount: 0, isNegative: false };
  }

  return { amount: Math.abs(num), isNegative };
}

/**
 * Parses flexible dates: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD-MMM-YYYY
 */
export function parseFlexibleDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    const m = parseInt(ddmmyyyy[2], 10) - 1;
    const y = parseInt(ddmmyyyy[3], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10);
    const m = parseInt(yyyymmdd[2], 10) - 1;
    const d = parseInt(yyyymmdd[3], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  // DD-MMM-YYYY (e.g. 15-Aug-2026 or 15 Aug 2026)
  const ddmmmyyyy = str.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})/);
  if (ddmmmyyyy) {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) return dt;
  }

  const standard = new Date(str);
  return isNaN(standard.getTime()) ? null : standard;
}

interface ColumnMapping {
  dateIdx: number;
  descIdx: number;
  debitIdx: number;
  creditIdx: number;
  amountIdx: number;
  typeIdx: number;
  balanceIdx: number;
  refIdx: number;
}

/**
 * Autodetects column positions from CSV header row
 */
export function detectCsvColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    dateIdx: -1,
    descIdx: -1,
    debitIdx: -1,
    creditIdx: -1,
    amountIdx: -1,
    typeIdx: -1,
    balanceIdx: -1,
    refIdx: -1
  };

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Date
    if (mapping.dateIdx === -1 && (h.includes('date') || h.includes('txndate') || h.includes('valuedate') || h.includes('time'))) {
      mapping.dateIdx = i;
    }
    // Description / Narration
    else if (mapping.descIdx === -1 && (
      h.includes('desc') || h.includes('narrat') || h.includes('particular') ||
      h.includes('remark') || h.includes('detail') || h.includes('transaction')
    )) {
      mapping.descIdx = i;
    }
    // Debit / Withdrawal
    else if (mapping.debitIdx === -1 && (h.includes('debit') || h.includes('withdrawal') || h === 'dr' || h.includes('dramt'))) {
      mapping.debitIdx = i;
    }
    // Credit / Deposit
    else if (mapping.creditIdx === -1 && (h.includes('credit') || h.includes('deposit') || h === 'cr' || h.includes('cramt'))) {
      mapping.creditIdx = i;
    }
    // General Amount
    else if (mapping.amountIdx === -1 && (h.includes('amount') || h === 'amt' || h.includes('total'))) {
      mapping.amountIdx = i;
    }
    // Type indicator (CR/DR or Debit/Credit)
    else if (mapping.typeIdx === -1 && (h === 'type' || h.includes('txntype') || h.includes('crdr'))) {
      mapping.typeIdx = i;
    }
    // Balance
    else if (mapping.balanceIdx === -1 && (h.includes('balance') || h.includes('bal') || h.includes('closing'))) {
      mapping.balanceIdx = i;
    }
    // Reference / UTR
    else if (mapping.refIdx === -1 && (
      h.includes('ref') || h.includes('utr') || h.includes('chq') ||
      h.includes('cheque') || h.includes('txnid') || h.includes('urn')
    )) {
      mapping.refIdx = i;
    }
  }

  return mapping;
}

/**
 * Parses raw CSV buffer into structured records and unparsed rows
 */
export function parseCsvBuffer(buffer: Buffer): ParserResult {
  const content = buffer.toString('utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return { records: [], unparsedRows: [], totalParsed: 0, totalFailed: 0 };
  }

  // Locate the header row (may be offset by bank metadata or bank name)
  let headerRowIndex = -1;
  let mapping: ColumnMapping = {
    dateIdx: -1, descIdx: -1, debitIdx: -1, creditIdx: -1, amountIdx: -1, typeIdx: -1, balanceIdx: -1, refIdx: -1
  };

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const rowTokens = parseCsvLine(lines[i]);
    const detected = detectCsvColumns(rowTokens);
    // Needs at least a date OR description AND an amount or debit/credit column
    const hasDateOrDesc = detected.dateIdx !== -1 || detected.descIdx !== -1;
    const hasMoney = detected.amountIdx !== -1 || detected.debitIdx !== -1 || detected.creditIdx !== -1;

    if (hasDateOrDesc && hasMoney) {
      headerRowIndex = i;
      mapping = detected;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not identify valid statement table headers. Ensure the CSV contains date, description, and amount/debit/credit columns.');
  }

  const records: ParsedRawRecord[] = [];
  const unparsedRows: UnparsedRow[] = [];

  for (let r = headerRowIndex + 1; r < lines.length; r++) {
    const rawLine = lines[r];
    const cells = parseCsvLine(rawLine);

    // Skip entirely empty rows
    if (cells.every(c => !c.trim())) continue;

    // Check row validity
    const dateRaw = mapping.dateIdx !== -1 ? cells[mapping.dateIdx] : '';
    const descRaw = mapping.descIdx !== -1 ? cells[mapping.descIdx] : '';
    const debitRaw = mapping.debitIdx !== -1 ? cells[mapping.debitIdx] : '';
    const creditRaw = mapping.creditIdx !== -1 ? cells[mapping.creditIdx] : '';
    const amountRaw = mapping.amountIdx !== -1 ? cells[mapping.amountIdx] : '';
    const typeRaw = mapping.typeIdx !== -1 ? cells[mapping.typeIdx] : '';
    const balanceRaw = mapping.balanceIdx !== -1 ? cells[mapping.balanceIdx] : '';
    const refRaw = mapping.refIdx !== -1 ? cells[mapping.refIdx] : '';

    const parsedDate = parseFlexibleDate(dateRaw);
    if (!parsedDate) {
      unparsedRows.push({
        rowNumber: r + 1,
        data: rawLine,
        reason: `Invalid or missing date value: "${dateRaw}"`
      });
      continue;
    }

    const debit = parseCleanAmount(debitRaw);
    const credit = parseCleanAmount(creditRaw);
    const generic = parseCleanAmount(amountRaw);

    let amount = 0;
    let direction: 'debit' | 'credit' = 'debit';

    if (debit.amount > 0) {
      amount = debit.amount;
      direction = 'debit';
    } else if (credit.amount > 0) {
      amount = credit.amount;
      direction = 'credit';
    } else if (generic.amount > 0) {
      amount = generic.amount;
      const typeLower = (typeRaw || '').toLowerCase();
      const descLower = (descRaw || '').toLowerCase();
      if (
        typeLower.includes('cr') ||
        typeLower.includes('credit') ||
        typeLower.includes('deposit') ||
        descLower.includes('salary') ||
        descLower.includes('dividend') ||
        descLower.includes('credit to')
      ) {
        direction = 'credit';
      } else if (generic.isNegative) {
        direction = 'debit';
      } else {
        direction = 'debit';
      }
    } else {
      unparsedRows.push({
        rowNumber: r + 1,
        data: rawLine,
        reason: 'Zero or missing monetary value in debit, credit, and amount columns.'
      });
      continue;
    }

    const description = (descRaw || 'Bank Transaction').trim();

    records.push({
      date: parsedDate,
      description,
      amount,
      direction,
      balance: balanceRaw ? parseCleanAmount(balanceRaw).amount : undefined,
      referenceId: refRaw ? String(refRaw).trim() : '',
      paymentMethod: 'Bank Statement (CSV)',
      rawRowNumber: r + 1
    });
  }

  return {
    records,
    unparsedRows,
    totalParsed: records.length,
    totalFailed: unparsedRows.length
  };
}

