import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { validateObjectId } from '../middleware/validateObjectId';
import { AppError } from '../middleware/errorHandler';
import {
  uploadStatement,
  getImportHistory,
  getImportById,
  updateStagedTransaction,
  confirmImport,
  cancelImport
} from '../controllers/statementController';
import { MAX_FILE_SIZE_BYTES } from '../services/statement/importValidationService';

const router = Router();

// Secure in-memory buffer storage with strict 10 MB upload ceiling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES // 10 MB strict limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.pdf'];
    const lastDotIndex = file.originalname.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? file.originalname.substring(lastDotIndex).toLowerCase() : '';
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only CSV, XLSX, XLS, and PDF files are accepted.', 400, 'UNSUPPORTED_FILE_TYPE'));
    }
  }
});

router.use(requireAuth);
router.use(checkDbReady);

// Upload & Stage Statement
router.post('/upload', upload.single('statement'), uploadStatement);

// Import History (paginated)
router.get('/imports', getImportHistory);

// Single Staged Import & Modifications
router.get('/imports/:id', validateObjectId('id'), getImportById);
router.patch('/imports/:id/staged-transactions/:txIndex', validateObjectId('id'), updateStagedTransaction);

// Confirmation & Cancellation
router.post('/imports/:id/confirm', validateObjectId('id'), confirmImport);
router.post('/imports/:id/cancel', validateObjectId('id'), cancelImport);

export default router;
