import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  analyzeTransactionRisk
} from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

// All transactions routes are protected and require DB
router.use(checkDbReady);
router.use(authenticate);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/:id', validateObjectId('id'), getTransactionById);
router.post('/:id/analyze', validateObjectId('id'), analyzeTransactionRisk);
router.patch('/:id', validateObjectId('id'), updateTransaction);
router.put('/:id', validateObjectId('id'), updateTransaction);
router.delete('/:id', validateObjectId('id'), deleteTransaction);

export default router;

