import mongoose from 'mongoose';
import { AppError } from '../../middleware/errorHandler';
import { StatementImport, IStagedTransaction, IStatementImport } from '../../models/StatementImport';
import { Transaction } from '../../models/Transaction';
import { validateUploadedFile, generateSafeServerName } from './importValidationService';
import { parseCsvBuffer } from './csvParser';
import { parseExcelBuffer } from './excelParser';
import { parseBankPdfBuffer } from './bankPdfParser';
import { parseGooglePayPdfBuffer, GPAY_LIMITATIONS_DISCLOSURE } from './googlePayPdfParser';
import { normalizeRawRecord } from './transactionNormalizer';
import { categorizeTransactionSmart } from './categorizationService';
import { detectDuplicatesMultiTier } from './duplicateDetectionService';
import { ParserResult } from './types';

export interface StageStatementParams {
  userId: string;
  file?: Express.Multer.File;
  source?: 'bank_statement' | 'gpay';
  bankName?: string;
  defaultCurrency?: string;
}

/**
 * Validates, parses, normalizes, categorizes, detects duplicates, and stages transactions
 */
export async function stageStatement(params: StageStatementParams) {
  const { userId, file, source = 'bank_statement', bankName, defaultCurrency = 'INR' } = params;

  if (!userId) {
    throw new AppError('Unauthorized: User ID is required', 401);
  }

  // 1. Rigorous File Validation (Magic bytes, extension, MIME, 10MB limit)
  const validation = validateUploadedFile(file, source);
  if (!validation.isValid || !validation.detectedType || !file) {
    throw new AppError(validation.error || 'Invalid file format or file failed security verification', 400);
  }

  const fileType = validation.detectedType;
  let parserResult: ParserResult;

  // 2. Format-specific Parsing
  try {
    if (fileType === 'csv') {
      parserResult = parseCsvBuffer(file.buffer);
    } else if (fileType === 'xlsx') {
      parserResult = parseExcelBuffer(file.buffer);
    } else if (fileType === 'gpay_pdf') {
      parserResult = await parseGooglePayPdfBuffer(file.buffer);
    } else {
      parserResult = await parseBankPdfBuffer(file.buffer);
    }
  } catch (err: any) {
    if (err.requiresOcr || err.code === 'OCR_REQUIRED') {
      throw new AppError(err.message, 422);
    }
    throw new AppError(`Failed to parse ${fileType.toUpperCase()} statement: ${err.message || 'Corrupt format'}`, 422);
  }

  if (!parserResult.records || parserResult.records.length === 0) {
    throw new AppError(
      `No valid financial transactions could be parsed from "${validation.sanitizedFilename}". Please verify the statement format and column headers.`,
      422
    );
  }

  // 3. Normalization & AI/Rule-based Categorization
  const stagedInitial: IStagedTransaction[] = [];
  for (let i = 0; i < parserResult.records.length; i++) {
    const raw = parserResult.records[i];
    const catOutcome = await categorizeTransactionSmart(raw.description, raw.amount, raw.direction);
    const staged = normalizeRawRecord(raw, i, catOutcome, {
      source,
      defaultCurrency,
      defaultPaymentMethod: source === 'gpay' ? 'Google Pay (UPI)' : 'Bank Statement Import'
    });
    stagedInitial.push(staged);
  }

  // 4. Multi-tier Duplicate Detection
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { stagedTransactions, duplicateCount } = await detectDuplicatesMultiTier(userObjectId, stagedInitial);

  // 5. Create Staged StatementImport Batch (Zero premature Transaction collection insertions)
  const safeStoredName = generateSafeServerName(file.originalname);
  const detectedBank = bankName || parserResult.bankDetected || (source === 'gpay' ? 'Google Pay' : 'Generic Bank Statement');

  const importDoc = await StatementImport.create({
    userId: userObjectId,
    fileName: validation.sanitizedFilename,
    fileType,
    fileSize: validation.fileSize,
    source,
    bankName: detectedBank,
    status: 'preview_ready',
    totalRecords: stagedTransactions.length,
    importedCount: 0,
    duplicateCount,
    stagedTransactions
  });

  return {
    importId: importDoc._id,
    fileName: importDoc.fileName,
    fileType: importDoc.fileType,
    source: importDoc.source,
    bankName: importDoc.bankName,
    totalRecords: importDoc.totalRecords,
    duplicateCount: importDoc.duplicateCount,
    stagedTransactions: importDoc.stagedTransactions,
    unparsedRows: parserResult.unparsedRows || [],
    limitations: source === 'gpay' ? GPAY_LIMITATIONS_DISCLOSURE : []
  };
}

/**
 * Retrieves a single staged import by ID for review
 */
export async function getStagedImportById(userId: string, importId: string): Promise<IStatementImport> {
  const statementImport = await StatementImport.findOne({
    _id: importId,
    userId: new mongoose.Types.ObjectId(userId)
  }).lean();

  if (!statementImport) {
    throw new AppError('Statement import record not found', 404);
  }

  return statementImport as unknown as IStatementImport;
}

/**
 * Retrieves paginated statement import history
 */
export async function getStatementImportHistory(
  userId: string,
  options: { page?: number; limit?: number } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const query = { userId: new mongoose.Types.ObjectId(userId) };

  const [imports, total] = await Promise.all([
    StatementImport.find(query)
      .select('-stagedTransactions') // Exclude heavy transaction arrays for summary list
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StatementImport.countDocuments(query)
  ]);

  return {
    imports,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Updates a single staged transaction prior to final confirmation
 */
export async function updateStagedItem(
  userId: string,
  importId: string,
  txIndex: number,
  updates: {
    category?: string;
    subcategory?: string;
    userExcluded?: boolean;
    title?: string;
    amount?: number;
    merchant?: string;
  }
) {
  const statementImport = await StatementImport.findOne({
    _id: importId,
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!statementImport) {
    throw new AppError('Statement import record not found', 404);
  }

  if (statementImport.status !== 'preview_ready') {
    throw new AppError(`Cannot modify transactions for an import in "${statementImport.status}" status`, 400);
  }

  if (isNaN(txIndex) || txIndex < 0 || txIndex >= statementImport.stagedTransactions.length) {
    throw new AppError('Invalid transaction index provided', 400);
  }

  const target = statementImport.stagedTransactions[txIndex];

  if (updates.category) {
    target.category = updates.category;
    target.categorizationSource = 'rule_based'; // Marked as user-reviewed
  }
  if (updates.subcategory !== undefined) target.subcategory = updates.subcategory;
  if (updates.userExcluded !== undefined) target.userExcluded = Boolean(updates.userExcluded);
  if (updates.title) target.title = updates.title;
  if (updates.merchant) target.merchant = updates.merchant;
  if (updates.amount !== undefined && !isNaN(Number(updates.amount))) {
    target.amount = Math.max(0, Number(updates.amount));
  }

  statementImport.markModified('stagedTransactions');
  await statementImport.save();

  return statementImport.stagedTransactions[txIndex];
}

/**
 * Confirms staged transactions and commits them into the live Transaction collection
 */
export async function confirmStagedImport(userId: string, importId: string) {
  const statementImport = await StatementImport.findOne({
    _id: importId,
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!statementImport) {
    throw new AppError('Statement import record not found', 404);
  }

  // Idempotency: cannot confirm twice
  if (statementImport.status === 'confirmed') {
    throw new AppError('This statement import has already been confirmed and committed to your ledger', 400);
  }

  if (statementImport.status === 'cancelled') {
    throw new AppError('Cannot confirm an import that has been cancelled', 400);
  }

  // Filter out user-excluded items
  const eligible = statementImport.stagedTransactions.filter(t => !t.userExcluded);
  if (eligible.length === 0) {
    throw new AppError('No eligible transactions to import (all items in this batch were excluded)', 400);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const docsToInsert = eligible.map(item => ({
    userId: userObjectId,
    title: item.title,
    merchant: item.merchant,
    amount: item.amount,
    currency: item.currency || 'INR',
    type: item.type,
    direction: item.direction,
    transactionType: item.transactionType || item.type,
    category: item.category,
    subcategory: item.subcategory || '',
    date: item.date,
    paymentMethod: item.paymentMethod || 'Statement Import',
    referenceId: item.referenceId || '',
    balance: item.balance,
    importBatchId: statementImport._id,
    categorizationStatus: item.categorizationSource === 'ml' ? 'predicted' : 'rule_based',
    userReviewedStatus: true,
    fraudReviewStatus: 'clean',
    duplicateStatus: item.isDuplicate ? 'possible_duplicate' : 'none',
    description: item.description || ''
  }));

  // Atomic batch insert
  await Transaction.insertMany(docsToInsert);

  // Update import status
  statementImport.status = 'confirmed';
  statementImport.importedCount = docsToInsert.length;
  statementImport.confirmedAt = new Date();
  await statementImport.save();

  return {
    importId: statementImport._id,
    importedCount: docsToInsert.length,
    status: statementImport.status,
    confirmedAt: statementImport.confirmedAt
  };
}

/**
 * Cancels a staged import and discards all pending transactions
 */
export async function cancelStagedImport(userId: string, importId: string) {
  const statementImport = await StatementImport.findOne({
    _id: importId,
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!statementImport) {
    throw new AppError('Statement import record not found', 404);
  }

  if (statementImport.status === 'confirmed') {
    throw new AppError('Cannot cancel an import that has already been confirmed into your financial ledger', 400);
  }

  statementImport.status = 'cancelled';
  await statementImport.save();

  return {
    importId: statementImport._id,
    status: statementImport.status
  };
}

