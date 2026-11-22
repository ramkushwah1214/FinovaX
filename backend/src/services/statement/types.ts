import mongoose from 'mongoose';

export type StatementFileType = 'csv' | 'xlsx' | 'pdf' | 'gpay_pdf';
export type ImportStatus = 'preview_ready' | 'confirmed' | 'cancelled' | 'failed' | 'ocr_required';

export interface ParsedRawRecord {
  date: Date;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
  balance?: number;
  referenceId?: string;
  paymentMethod?: string;
  merchant?: string;
  rawRowNumber?: number;
}

export interface UnparsedRow {
  rowNumber: number;
  data: any;
  reason: string;
}

export interface ParserResult {
  records: ParsedRawRecord[];
  unparsedRows: UnparsedRow[];
  bankDetected?: string;
  requiresOcr?: boolean;
  totalParsed: number;
  totalFailed: number;
}

export interface FileValidationResult {
  isValid: boolean;
  detectedType: StatementFileType | null;
  sanitizedFilename: string;
  fileSize: number;
  error?: string;
}

export interface BankParserStrategy {
  bankName: string;
  canParse: (text: string) => boolean;
  parse: (text: string) => ParsedRawRecord[];
}

export interface OcrAdapter {
  isAvailable: () => boolean;
  extractText: (buffer: Buffer) => Promise<string>;
}

