import { ParsedRawRecord, ParserResult, BankParserStrategy, OcrAdapter } from './types';
import { parseCleanAmount, parseFlexibleDate } from './csvParser';
import { extractUpiReferenceId } from './googlePayPdfParser';

/**
 * Default Null OCR Adapter: raises structured OCR_REQUIRED notice
 */
export class NullOcrAdapter implements OcrAdapter {
  isAvailable(): boolean {
    return false;
  }

  async extractText(_buffer: Buffer): Promise<string> {
    throw new Error('OCR_REQUIRED: This PDF statement appears to be scanned or image-based with no extractable text layer. Optical Character Recognition (OCR) is required.');
  }
}

let activeOcrAdapter: OcrAdapter = new NullOcrAdapter();

export function setOcrAdapter(adapter: OcrAdapter) {
  activeOcrAdapter = adapter;
}

/**
 * Extracts raw text from a PDF buffer safely
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfModule: any = require('pdf-parse');
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      if (typeof res === 'string') return res;
      if (res && res.text) return res.text;
      return JSON.stringify(res);
    }
    if (typeof pdfModule === 'function') {
      const res = await pdfModule(buffer);
      return res.text || '';
    }
  } catch {
    // If PDF text stream is missing or structure has no extractable text
    return '';
  }
  return '';
}

/**
 * Helper: Identify whether a line is a header, footer, or non-transaction summary row
 */
function isSummaryOrHeaderRow(line: string): boolean {
  const l = line.toLowerCase().trim();
  if (!l) return true;

  return (
    l.includes('opening balance') ||
    l.includes('closing balance') ||
    l.includes('brought forward') ||
    l.includes('carried forward') ||
    l.includes('b/f') ||
    l.includes('c/f') ||
    l.includes('total withdrawal') ||
    l.includes('total deposit') ||
    l.includes('total debit') ||
    l.includes('total credit') ||
    l.startsWith('page ') ||
    l.includes('end of statement') ||
    l.includes('computer generated') ||
    l.includes('account statement') ||
    l.includes('statement of account') ||
    l.includes('customer name') ||
    l.includes('account number') ||
    l.includes('ifsc code') ||
    l.includes('branch address') ||
    (l.includes('date') && (l.includes('particular') || l.includes('narration') || l.includes('debit') || l.includes('withdrawal')))
  );
}

const DATE_REGEX_PATTERN = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[- ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[- ]\d{2,4})/i;

/**
 * Strategy 1: DCB Bank (Development Credit Bank)
 * Handles DCB multi-column layout, multiline narrations, UTR extraction, and summary exclusions
 */
export const DcbBankStrategy: BankParserStrategy = {
  bankName: 'DCB Bank',
  canParse: (text: string) => /DCB\s*BANK|DEVELOPMENT\s*CREDIT\s*BANK|DCB.*STATEMENT/i.test(text),
  parse: (text: string): ParsedRawRecord[] => {
    const results: ParsedRawRecord[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let current: {
      date: Date;
      description: string;
      amount: number;
      direction: 'debit' | 'credit';
      balance?: number;
      referenceId?: string;
    } | null = null;

    const commitCurrent = () => {
      if (current && current.amount > 0) {
        results.push({
          date: current.date,
          description: current.description.trim(),
          amount: current.amount,
          direction: current.direction,
          balance: current.balance,
          referenceId: current.referenceId || extractUpiReferenceId(current.description),
          paymentMethod: 'DCB Bank Statement (PDF)'
        });
      }
      current = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isSummaryOrHeaderRow(line)) {
        continue;
      }

      const dateMatch = line.match(DATE_REGEX_PATTERN);
      if (dateMatch) {
        commitCurrent();

        const dateStr = dateMatch[1];
        const parsedDate = parseFlexibleDate(dateStr);
        if (!parsedDate) continue;

        // Strip posting date and optional value date
        let rest = line.slice(dateMatch[0].length).trim();
        const secondDateMatch = rest.match(DATE_REGEX_PATTERN);
        if (secondDateMatch) {
          rest = rest.slice(secondDateMatch[0].length).trim();
        }

        // Tail match: Debit, Credit, Balance, [CR/DR]
        const tailMatch = rest.match(/([0-9,]+\.\d{2}|-)\s+([0-9,]+\.\d{2}|-)?\s*([0-9,]+\.\d{2}|-)?\s*(CR|DR|Cr|Dr)?\s*$/);
        if (tailMatch) {
          const matchedTail = tailMatch[0];
          const descPart = rest.slice(0, rest.length - matchedTail.length).trim();

          const tokens = [tailMatch[1], tailMatch[2], tailMatch[3]].filter(Boolean).map(t => t.trim());
          const indicator = (tailMatch[4] || '').toUpperCase();

          let amount = 0;
          let direction: 'debit' | 'credit' = 'debit';
          let balance: number | undefined;

          if (tokens.length >= 3) {
            // [Debit, Credit, Balance]
            const dVal = parseCleanAmount(tokens[0]).amount;
            const cVal = parseCleanAmount(tokens[1]).amount;
            balance = parseCleanAmount(tokens[2]).amount;

            if (dVal > 0) {
              amount = dVal;
              direction = 'debit';
            } else if (cVal > 0) {
              amount = cVal;
              direction = 'credit';
            }
          } else if (tokens.length === 2) {
            // [Amount, Balance] or [Debit, Credit]
            const first = parseCleanAmount(tokens[0]).amount;
            const second = parseCleanAmount(tokens[1]).amount;

            amount = first;
            balance = second;

            if (indicator === 'CR' || /salary|credit|deposit|dividend|refund/i.test(descPart)) {
              direction = 'credit';
            } else {
              direction = 'debit';
            }
          } else if (tokens.length === 1) {
            amount = parseCleanAmount(tokens[0]).amount;
            if (indicator === 'CR') direction = 'credit';
          }

          if (amount > 0) {
            current = {
              date: parsedDate,
              description: descPart || 'DCB Transaction',
              amount,
              direction,
              balance,
              referenceId: extractUpiReferenceId(descPart)
            };
          }
        }
      } else if (current) {
        // Multiline narration continuation: append to active transaction
        if (!line.includes('===') && !line.includes('---')) {
          current.description += ' ' + line;
          if (!current.referenceId) {
            current.referenceId = extractUpiReferenceId(line);
          }
        }
      }
    }

    commitCurrent();
    return results;
  }
};

/**
 * Strategy 2: HDFC Bank
 */
export const HdfcBankStrategy: BankParserStrategy = {
  bankName: 'HDFC Bank',
  canParse: (text: string) => /HDFC\s*BANK/i.test(text),
  parse: (text: string): ParsedRawRecord[] => {
    const results: ParsedRawRecord[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isSummaryOrHeaderRow(line)) continue;

      const dateMatch = line.match(DATE_REGEX_PATTERN);
      if (!dateMatch) continue;

      const date = parseFlexibleDate(dateMatch[1]);
      if (!date) continue;

      const rest = line.slice(dateMatch[0].length).trim();
      const tailMatch = rest.match(/([0-9,]+\.\d{2}|-)\s+([0-9,]+\.\d{2}|-)?\s*([0-9,]+\.\d{2}|-)?\s*(CR|DR|Cr|Dr)?\s*$/);
      if (tailMatch) {
        const desc = rest.slice(0, rest.length - tailMatch[0].length).trim();
        const tokens = [tailMatch[1], tailMatch[2], tailMatch[3]].filter(Boolean);

        let amount = 0;
        let direction: 'debit' | 'credit' = 'debit';
        let balance: number | undefined;

        if (tokens.length >= 3) {
          const dVal = parseCleanAmount(tokens[0]).amount;
          const cVal = parseCleanAmount(tokens[1]).amount;
          balance = parseCleanAmount(tokens[2]).amount;
          if (dVal > 0) {
            amount = dVal;
            direction = 'debit';
          } else if (cVal > 0) {
            amount = cVal;
            direction = 'credit';
          }
        } else if (tokens.length >= 1) {
          amount = parseCleanAmount(tokens[0]).amount;
          if (tailMatch[4]?.toUpperCase() === 'CR' || /salary|credit|deposit/i.test(desc)) {
            direction = 'credit';
          }
        }

        if (amount > 0) {
          results.push({
            date,
            description: desc || 'HDFC Bank Transaction',
            amount,
            direction,
            balance,
            referenceId: extractUpiReferenceId(desc),
            paymentMethod: 'HDFC Bank PDF'
          });
        }
      }
    }
    return results;
  }
};

/**
 * Strategy 3: State Bank of India (SBI)
 */
export const SbiBankStrategy: BankParserStrategy = {
  bankName: 'State Bank of India',
  canParse: (text: string) => /STATE\s*BANK\s*OF\s*INDIA|SBI/i.test(text),
  parse: (text: string): ParsedRawRecord[] => {
    const results: ParsedRawRecord[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (isSummaryOrHeaderRow(line)) continue;

      const dateMatch = line.match(DATE_REGEX_PATTERN);
      if (!dateMatch) continue;

      const date = parseFlexibleDate(dateMatch[1]);
      if (!date) continue;

      const rest = line.slice(dateMatch[0].length).trim();
      const tailMatch = rest.match(/([0-9,]+\.\d{2}|-)\s+([0-9,]+\.\d{2}|-)?\s*([0-9,]+\.\d{2}|-)?\s*(CR|DR|Cr|Dr)?\s*$/);
      if (tailMatch) {
        const desc = rest.slice(0, rest.length - tailMatch[0].length).trim();
        const tokens = [tailMatch[1], tailMatch[2], tailMatch[3]].filter(Boolean);

        let amount = 0;
        let direction: 'debit' | 'credit' = 'debit';
        let balance: number | undefined;

        if (tokens.length >= 3) {
          const dVal = parseCleanAmount(tokens[0]).amount;
          const cVal = parseCleanAmount(tokens[1]).amount;
          balance = parseCleanAmount(tokens[2]).amount;
          if (dVal > 0) {
            amount = dVal;
            direction = 'debit';
          } else if (cVal > 0) {
            amount = cVal;
            direction = 'credit';
          }
        } else if (tokens.length >= 1) {
          amount = parseCleanAmount(tokens[0]).amount;
          if (tailMatch[4]?.toUpperCase() === 'CR' || /salary|credit|deposit/i.test(desc)) {
            direction = 'credit';
          }
        }

        if (amount > 0) {
          results.push({
            date,
            description: desc || 'SBI Transaction',
            amount,
            direction,
            balance,
            referenceId: extractUpiReferenceId(desc),
            paymentMethod: 'SBI PDF Statement'
          });
        }
      }
    }
    return results;
  }
};

/**
 * Strategy 4: ICICI Bank
 */
export const IciciBankStrategy: BankParserStrategy = {
  bankName: 'ICICI Bank',
  canParse: (text: string) => /ICICI\s*BANK/i.test(text),
  parse: (text: string): ParsedRawRecord[] => {
    const results: ParsedRawRecord[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (isSummaryOrHeaderRow(line)) continue;

      const dateMatch = line.match(DATE_REGEX_PATTERN);
      if (!dateMatch) continue;

      const date = parseFlexibleDate(dateMatch[1]);
      if (!date) continue;

      const rest = line.slice(dateMatch[0].length).trim();
      const tailMatch = rest.match(/([0-9,]+\.\d{2})\s*(Cr|Dr|CR|DR)?\s*([0-9,]+\.\d{2})?\s*$/i);
      if (tailMatch) {
        const desc = rest.slice(0, rest.length - tailMatch[0].length).trim();
        const amount = parseCleanAmount(tailMatch[1]).amount;
        const indicator = (tailMatch[2] || '').toUpperCase();
        const balance = tailMatch[3] ? parseCleanAmount(tailMatch[3]).amount : undefined;

        let direction: 'debit' | 'credit' = indicator === 'CR' ? 'credit' : 'debit';
        if (indicator !== 'CR' && /salary|deposit|refund/i.test(desc)) {
          direction = 'credit';
        }

        if (amount > 0) {
          results.push({
            date,
            description: desc || 'ICICI Transaction',
            amount,
            direction,
            balance,
            referenceId: extractUpiReferenceId(desc),
            paymentMethod: 'ICICI Bank PDF'
          });
        }
      }
    }
    return results;
  }
};

/**
 * Strategy 5: Axis Bank
 */
export const AxisBankStrategy: BankParserStrategy = {
  bankName: 'Axis Bank',
  canParse: (text: string) => /AXIS\s*BANK/i.test(text),
  parse: (text: string): ParsedRawRecord[] => {
    const results: ParsedRawRecord[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (isSummaryOrHeaderRow(line)) continue;

      const dateMatch = line.match(DATE_REGEX_PATTERN);
      if (!dateMatch) continue;

      const date = parseFlexibleDate(dateMatch[1]);
      if (!date) continue;

      const rest = line.slice(dateMatch[0].length).trim();
      const tailMatch = rest.match(/([0-9,]+\.\d{2})\s*(CR|DR|Cr|Dr)?\s*([0-9,]+\.\d{2})?\s*$/i);
      if (tailMatch) {
        const desc = rest.slice(0, rest.length - tailMatch[0].length).trim();
        const amount = parseCleanAmount(tailMatch[1]).amount;
        const indicator = (tailMatch[2] || '').toUpperCase();
        const balance = tailMatch[3] ? parseCleanAmount(tailMatch[3]).amount : undefined;

        const direction: 'debit' | 'credit' = indicator === 'CR' ? 'credit' : 'debit';
        if (amount > 0) {
          results.push({
            date,
            description: desc || 'Axis Bank Transaction',
            amount,
            direction,
            balance,
            referenceId: extractUpiReferenceId(desc),
            paymentMethod: 'Axis Bank PDF'
          });
        }
      }
    }
    return results;
  }
};

/**
 * Robust Multi-Column Generic Bank PDF Fallback
 * Correctly parses Date, Description, Debit, Credit, and Balance columns while rejecting summary totals
 */
export function parseGenericBankPdfLines(lines: string[]): ParsedRawRecord[] {
  const results: ParsedRawRecord[] = [];

  for (const line of lines) {
    if (isSummaryOrHeaderRow(line)) continue;

    const dateMatch = line.match(DATE_REGEX_PATTERN);
    if (!dateMatch) continue;

    const date = parseFlexibleDate(dateMatch[1]);
    if (!date) continue;

    let rest = line.slice(dateMatch[0].length).trim();
    // Optional value date check
    const secondDateMatch = rest.match(DATE_REGEX_PATTERN);
    if (secondDateMatch) {
      rest = rest.slice(secondDateMatch[0].length).trim();
    }

    const tailMatch = rest.match(/([0-9,]+\.\d{2}|-)\s+([0-9,]+\.\d{2}|-)?\s*([0-9,]+\.\d{2}|-)?\s*(CR|DR|Cr|Dr)?\s*$/);
    if (tailMatch) {
      const desc = rest.slice(0, rest.length - tailMatch[0].length).trim();
      const tokens = [tailMatch[1], tailMatch[2], tailMatch[3]].filter(Boolean);
      const indicator = (tailMatch[4] || '').toUpperCase();

      let amount = 0;
      let direction: 'debit' | 'credit' = 'debit';
      let balance: number | undefined;

      if (tokens.length >= 3) {
        const dVal = parseCleanAmount(tokens[0]).amount;
        const cVal = parseCleanAmount(tokens[1]).amount;
        balance = parseCleanAmount(tokens[2]).amount;

        if (dVal > 0) {
          amount = dVal;
          direction = 'debit';
        } else if (cVal > 0) {
          amount = cVal;
          direction = 'credit';
        }
      } else if (tokens.length >= 1) {
        amount = parseCleanAmount(tokens[0]).amount;
        if (tokens.length >= 2) {
          balance = parseCleanAmount(tokens[1]).amount;
        }
        if (indicator === 'CR' || /salary|credit|deposit|dividend|refund/i.test(desc)) {
          direction = 'credit';
        }
      }

      if (amount > 0) {
        results.push({
          date,
          description: desc || 'Bank Transaction',
          amount,
          direction,
          balance,
          referenceId: extractUpiReferenceId(desc),
          paymentMethod: 'Bank Statement (PDF)'
        });
      }
    }
  }

  return results;
}

const REGISTERED_STRATEGIES: BankParserStrategy[] = [
  DcbBankStrategy,
  HdfcBankStrategy,
  SbiBankStrategy,
  IciciBankStrategy,
  AxisBankStrategy
];

/**
 * Orchestrates text-based bank PDF statement parsing with scanned PDF detection
 */
export async function parseBankPdfBuffer(buffer: Buffer): Promise<ParserResult> {
  let text = await extractPdfText(buffer);

  // Scanned PDF detection: Empty text or fewer than 50 characters
  if (!text || text.trim().length < 50) {
    if (activeOcrAdapter.isAvailable()) {
      text = await activeOcrAdapter.extractText(buffer);
    } else {
      const error: any = new Error('OCR_REQUIRED: The uploaded PDF statement contains no extractable text layer (scanned or image-based document). Please upload a digital PDF statement or use CSV/XLSX.');
      error.code = 'OCR_REQUIRED';
      error.requiresOcr = true;
      throw error;
    }
  }

  let bankDetected = 'Generic Bank';
  let records: ParsedRawRecord[] = [];

  // 1. Try bank-specific strategies
  for (const strategy of REGISTERED_STRATEGIES) {
    if (strategy.canParse(text)) {
      bankDetected = strategy.bankName;
      records = strategy.parse(text);
      if (records.length > 0) {
        break;
      }
    }
  }

  // 2. Generic fallback if bank strategy yielded 0 records
  if (records.length === 0) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    records = parseGenericBankPdfLines(lines);
  }

  return {
    records,
    unparsedRows: [],
    bankDetected,
    requiresOcr: false,
    totalParsed: records.length,
    totalFailed: 0
  };
}
