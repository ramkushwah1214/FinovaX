import { Router } from 'express';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
} from '../controllers/budgetController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

router.use(checkDbReady);
router.use(authenticate);

router.get('/', getBudgets);
router.post('/', createBudget);
router.patch('/:id', validateObjectId('id'), updateBudget);
router.delete('/:id', validateObjectId('id'), deleteBudget);

export default router;
