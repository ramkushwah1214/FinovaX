import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import {
  getBankConnections,
  initiateConsent,
  handleConsentCallback,
  revokeConsent
} from '../controllers/bankConnectionController';

const router = Router();

router.use(requireAuth);
router.use(checkDbReady);

router.get('/', getBankConnections);
router.post('/initiate', initiateConsent);
router.post('/consent-callback', handleConsentCallback);
router.post('/:id/revoke', revokeConsent);

export default router;

