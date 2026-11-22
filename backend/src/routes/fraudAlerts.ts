import { Router } from 'express';
import {
  getFraudAlerts,
  getFraudAlertById,
  updateFraudAlertStatus
} from '../controllers/fraudAlertController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

router.use(checkDbReady);
router.use(authenticate);

router.get('/', getFraudAlerts);
router.get('/:id', validateObjectId('id'), getFraudAlertById);
router.patch('/:id', validateObjectId('id'), updateFraudAlertStatus);

export default router;
