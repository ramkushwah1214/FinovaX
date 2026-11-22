import * as XLSX from 'xlsx';
import { ParsedRawRecord, ParserResult, UnparsedRow } from './types';
import { detectCsvColumns, parseCleanAmount, parseFlexibleDate } from './csvParser';

export const MAX_EXCEL_ROWS = 10000; // DoS defense

/**
 * Converts Excel serial dates (days since 1899-12-30) into JavaScript Date objects
 */
export function excelSerialDateToJSDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  const totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

/**
 * Parses dates from Excel cell values, which may be strings, numbers (serial dates), or Date instances
 */
export function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === 'number') {
    // Standard Excel date serial range roughly 30000 (1982) to 60000 (2064)
    if (val >= 20000 && val <= 70000) {
      return excelSerialDateToJSDate(val);
    }
  }

  const str = String(val).trim();
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num >= 20000 && num <= 70000) {
      return excelSerialDateToJSDate(num);
    }
  }

  return parseFlexibleDate(val);
}

/**
 * Identifies the most relevant sheet containing financial transaction data
 */
export function findTransactionSheet(workbook: XLSX.WorkBook): string {
  const preferredNames = ['transactions', 'statement', 'account statement', 'sheet1', 'passbook'];

  for (const name of preferredNames) {
    const match = workbook.SheetNames.find(s => s.toLowerCase().trim() === name);
    if (match) return match;
  }

  // Otherwise, inspect sheets to find the first sheet with at least 2 rows
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (ws && ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      if (range.e.r - range.s.r >= 1) {
        return sheetName;
      }
    }
  }

  return workbook.SheetNames[0];
}

/**
 * Parses XLSX / XLS buffer with sheet autodetection and metadata offset handling
 */
export function parseExcelBuffer(buffer: Buffer): ParserResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const targetSheetName = findTransactionSheet(workbook);
  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`Target worksheet "${targetSheetName}" could not be opened.`);
  }

  // Convert sheet to a 2D array of rows
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    return { records: [], unparsedRows: [], totalParsed: 0, totalFailed: 0 };
  }

  if (rawMatrix.length > MAX_EXCEL_ROWS) {
    throw new Error(`Excel statement exceeds the maximum limit of ${MAX_EXCEL_ROWS} rows.`);
  }

  // Scan the top 20 rows to detect the table header
  let headerRowIndex = -1;
  let headers: string[] = [];
  let mapping = {
    dateIdx: -1, descIdx: -1, debitIdx: -1, creditIdx: -1, amountIdx: -1, typeIdx: -1, balanceIdx: -1, refIdx: -1
  };

  for (let r = 0; r < Math.min(rawMatrix.length, 20); r++) {
    const candidateHeaders = rawMatrix[r].map(cell => String(cell || '').trim());
    const detected = detectCsvColumns(candidateHeaders);
    const hasDateOrDesc = detected.dateIdx !== -1 || detected.descIdx !== -1;
    const hasMoney = detected.amountIdx !== -1 || detected.debitIdx !== -1 || detected.creditIdx !== -1;

    if (hasDateOrDesc && hasMoney) {
      headerRowIndex = r;
      headers = candidateHeaders;
      mapping = detected;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Could not find a valid transaction table header in sheet "${targetSheetName}".`);
  }

  const records: ParsedRawRecord[] = [];
  const unparsedRows: UnparsedRow[] = [];

  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || row.every((c: any) => !String(c || '').trim())) continue;

    const dateRaw = mapping.dateIdx !== -1 ? row[mapping.dateIdx] : '';
    const descRaw = mapping.descIdx !== -1 ? row[mapping.descIdx] : '';
    const debitRaw = mapping.debitIdx !== -1 ? row[mapping.debitIdx] : '';
    const creditRaw = mapping.creditIdx !== -1 ? row[mapping.creditIdx] : '';
    const amountRaw = mapping.amountIdx !== -1 ? row[mapping.amountIdx] : '';
    const typeRaw = mapping.typeIdx !== -1 ? row[mapping.typeIdx] : '';
    const balanceRaw = mapping.balanceIdx !== -1 ? row[mapping.balanceIdx] : '';
    const refRaw = mapping.refIdx !== -1 ? row[mapping.refIdx] : '';

    const parsedDate = parseExcelDate(dateRaw);
    if (!parsedDate) {
      unparsedRows.push({
        rowNumber: r + 1,
        data: row,
        reason: `Invalid or unreadable date: "${dateRaw}"`
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
      const typeLower = String(typeRaw || '').toLowerCase();
      const descLower = String(descRaw || '').toLowerCase();
      if (
        typeLower.includes('cr') ||
        typeLower.includes('credit') ||
        typeLower.includes('deposit') ||
        descLower.includes('salary') ||
        descLower.includes('dividend')
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
        data: row,
        reason: 'Missing or zero monetary value in debit, credit, or amount fields.'
      });
      continue;
    }

    const description = String(descRaw || 'Excel Transaction').trim();

    records.push({
      date: parsedDate,
      description,
      amount,
      direction,
      balance: balanceRaw ? parseCleanAmount(balanceRaw).amount : undefined,
      referenceId: refRaw ? String(refRaw).trim() : '',
      paymentMethod: 'Bank Statement (Excel)',
      rawRowNumber: r + 1
    });
  }

  return {
    records,
    unparsedRows,
    bankDetected: targetSheetName,
    totalParsed: records.length,
    totalFailed: unparsedRows.length
  };
}

