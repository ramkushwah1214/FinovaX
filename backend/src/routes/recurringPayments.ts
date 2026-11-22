import { Router } from 'express';
import {
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment
} from '../controllers/recurringPaymentController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

router.use(checkDbReady);
router.use(authenticate);

router.get('/', getRecurringPayments);
router.post('/', createRecurringPayment);
router.patch('/:id', validateObjectId('id'), updateRecurringPayment);
router.delete('/:id', validateObjectId('id'), deleteRecurringPayment);

export default router;
