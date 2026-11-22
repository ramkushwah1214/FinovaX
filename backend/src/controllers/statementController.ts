import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  stageStatement,
  getStagedImportById,
  getStatementImportHistory,
  updateStagedItem,
  confirmStagedImport,
  cancelStagedImport
} from '../services/statement/statementImportService';

/**
 * @route   POST /api/statements/upload
 * @desc    Uploads a statement file (CSV, XLSX, PDF, GPay PDF), parses transactions, detects duplicates, and stages for review
 * @access  Private
 */
export async function uploadStatement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized: User ID not found', 401));
    }

    const file = req.file;
    if (!file) {
      return next(new AppError('Please select a statement file to upload', 400));
    }

    const source = (req.body.source === 'gpay' ? 'gpay' : 'bank_statement') as 'bank_statement' | 'gpay';
    const bankName = req.body.bankName;
    const defaultCurrency = req.body.currency || 'INR';

    const result = await stageStatement({
      userId,
      file,
      source,
      bankName,
      defaultCurrency
    });

    res.status(201).json({
      status: 'success',
      message: `Statement parsed successfully. ${result.totalRecords} transactions found (${result.duplicateCount} potential duplicates).`,
      data: result
    });
  } catch (error: any) {
    next(error);
  }
}

/**
 * @route   GET /api/statements/imports
 * @desc    Fetch paginated import history for the authenticated user
 * @access  Private
 */
export async function getImportHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized: User ID not found', 401));
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await getStatementImportHistory(userId, { page, limit });

    res.status(200).json({
      status: 'success',
      data: result.imports,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/statements/imports/:id
 * @desc    Fetch a specific staged statement import with all transactions for preview/editing
 * @access  Private
 */
export async function getImportById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized: User ID not found', 401));
    }

    const { id } = req.params;
    const statementImport = await getStagedImportById(userId, id);

    res.status(200).json({
      status: 'success',
      data: statementImport
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/statements/imports/:id/staged-transactions/:txIndex
 * @desc    Update a single staged transaction (e.g. category correction, amount, merchant, or user exclusion)
 * @access  Private
 */
export async function updateStagedTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized: User ID not found', 401));
    }

    const { id, txIndex } = req.params;
    const index = parseInt(txIndex, 10);

    const updated = await updateStagedItem(userId, id, index, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Staged transaction updated',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/statements/imports/:id/confirm
 * @desc    Commit staged transactions into the MongoDB Transaction collection
 * @access  Private
 */
export async function confirmImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized: User ID not found', 401));
    }

    const { id } = req.params;
    const result = await confirmStagedImport(userId, id);

    res.status(200).json({
      status: 'success',
      message: `Successfully imported ${result.importedCount} transactions into your financial ledger.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/statements/imports/:id/cancel
 * @desc    Cancel a staged import and discard pending transactions
 * @access  Private
 */
export async function cancelImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized: User ID not found', 401));
    }

    const { id } = req.params;
    const result = await cancelStagedImport(userId, id);

    res.status(200).json({
      status: 'success',
      message: 'Statement import cancelled and discarded',
      data: result
    });
  } catch (error) {
    next(error);
  }
}
