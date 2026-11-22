import path from 'path';
import crypto from 'crypto';
import { FileValidationResult, StatementFileType } from './types';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls', '.pdf']);

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'application/x-pdf'
]);

/**
 * Sanitizes original filename to prevent path traversal, control character injection,
 * and dangerous executable disguises.
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return `statement_${Date.now()}.dat`;
  }

  // Strip null bytes and control chars
  let cleaned = originalName.replace(/[\x00-\x1f\x7f]/g, '');

  // Extract base filename without directories
  cleaned = path.basename(cleaned);

  // Strip path traversal attempts
  cleaned = cleaned.replace(/\.\.+/g, '.');

  // Replace special characters except alphanumeric, dash, underscore, and dot
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure reasonable length limit
  if (cleaned.length > 120) {
    const ext = path.extname(cleaned);
    const base = path.basename(cleaned, ext).slice(0, 100);
    cleaned = `${base}${ext}`;
  }

  return cleaned || `statement_${Date.now()}`;
}

/**
 * Generates an internal cryptographic unique name for safe tracking
 */
export function generateSafeServerName(extension: string): string {
  const safeExt = extension.startsWith('.') ? extension : `.${extension}`;
  const randomHex = crypto.randomBytes(16).toString('hex');
  return `stmt_${Date.now()}_${randomHex}${safeExt}`;
}

/**
 * Validates file signature (magic bytes) to ensure file content matches claimed type
 */
export function validateMagicBytes(buffer: Buffer, claimedExt: string): { valid: boolean; reason?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, reason: 'Uploaded file is completely empty (0 bytes).' };
  }

  // Executable signatures to reject immediately
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, reason: 'Security rejection: Windows executable (MZ header) detected.' };
  }
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, reason: 'Security rejection: Linux ELF binary detected.' };
  }

  const ext = claimedExt.toLowerCase();

  // 1. PDF: Must begin with %PDF (0x25 0x50 0x44 0x46)
  if (ext === '.pdf') {
    if (buffer.length < 5) {
      return { valid: false, reason: 'Malformed PDF file: too small to contain valid header.' };
    }
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      return { valid: false, reason: 'Invalid PDF file signature. File header does not match %PDF.' };
    }
    return { valid: true };
  }

  // 2. XLSX: PK\x03\x04 (0x50 0x4B 0x03 0x04) - Zip archive container for OpenXML
  if (ext === '.xlsx') {
    if (buffer.length < 4) {
      return { valid: false, reason: 'Malformed XLSX file: too small to contain valid header.' };
    }
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      return { valid: false, reason: 'Invalid XLSX signature: Missing OpenXML ZIP container signature.' };
    }
    return { valid: true };
  }

  // 3. XLS: 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1 (OLE Compound File)
  if (ext === '.xls') {
    if (buffer.length < 8) {
      return { valid: false, reason: 'Malformed XLS file: too small.' };
    }
    const isOle =
      buffer[0] === 0xD0 &&
      buffer[1] === 0xCF &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xE0 &&
      buffer[4] === 0xA1 &&
      buffer[5] === 0xB1 &&
      buffer[6] === 0x1A &&
      buffer[7] === 0xE1;
    if (!isOle) {
      return { valid: false, reason: 'Invalid XLS signature: Missing OLE Compound header.' };
    }
    return { valid: true };
  }

  // 4. CSV: Plain text. Check first 1024 bytes for null bytes or excessive control chars
  if (ext === '.csv') {
    const sampleSize = Math.min(buffer.length, 1024);
    let nullByteCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0x00) {
        nullByteCount++;
      }
    }
    if (nullByteCount > 0) {
      return { valid: false, reason: 'Invalid CSV file: Binary null bytes detected in text stream.' };
    }
    return { valid: true };
  }

  return { valid: false, reason: `Unsupported file extension: ${claimedExt}` };
}

/**
 * Full security validation of incoming uploaded file
 */
export function validateUploadedFile(
  file: Express.Multer.File | undefined,
  source: 'bank_statement' | 'gpay' = 'bank_statement'
): FileValidationResult {
  if (!file) {
    return {
      isValid: false,
      detectedType: null,
      sanitizedFilename: '',
      fileSize: 0,
      error: 'No statement file was uploaded.'
    };
  }

  // 1. File size check
  if (file.size <= 0) {
    return {
      isValid: false,
      detectedType: null,
      sanitizedFilename: sanitizeFilename(file.originalname),
      fileSize: file.size,
      error: 'Uploaded statement file is empty (0 bytes).'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      detectedType: null,
      sanitizedFilename: sanitizeFilename(file.originalname),
      fileSize: file.size,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 10 MB.`
    };
  }

  // 2. Extension validation
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      detectedType: null,
      sanitizedFilename: sanitizeFilename(file.originalname),
      fileSize: file.size,
      error: `Unsupported file extension "${ext}". Accepted formats: .csv, .xlsx, .xls, .pdf`
    };
  }

  // 3. MIME type check (soft check with normalization)
  const mime = (file.mimetype || '').toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime) && !mime.includes('text') && !mime.includes('spreadsheet') && !mime.includes('pdf')) {
    return {
      isValid: false,
      detectedType: null,
      sanitizedFilename: sanitizeFilename(file.originalname),
      fileSize: file.size,
      error: `Unsupported MIME type "${file.mimetype}". Please upload a standard CSV, XLSX, or PDF statement.`
    };
  }

  // 4. Magic bytes validation
  const magicCheck = validateMagicBytes(file.buffer, ext);
  if (!magicCheck.valid) {
    return {
      isValid: false,
      detectedType: null,
      sanitizedFilename: sanitizeFilename(file.originalname),
      fileSize: file.size,
      error: magicCheck.reason || 'File integrity check failed.'
    };
  }

  // 5. Determine canonical StatementFileType
  let detectedType: StatementFileType = 'csv';
  if (ext === '.xlsx' || ext === '.xls') {
    detectedType = 'xlsx';
  } else if (ext === '.pdf') {
    detectedType = source === 'gpay' ? 'gpay_pdf' : 'pdf';
  } else if (ext === '.csv') {
    detectedType = 'csv';
  }

  return {
    isValid: true,
    detectedType,
    sanitizedFilename: sanitizeFilename(file.originalname),
    fileSize: file.size
  };
}

