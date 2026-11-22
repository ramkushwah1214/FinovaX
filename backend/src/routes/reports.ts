import { Router } from 'express';
import {
  getReportSummary,
  getReportCashFlow,
  getReportCategoryBreakdown
} from '../controllers/reportsController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';

const router = Router();

router.use(checkDbReady);
router.use(authenticate);

router.get('/summary', getReportSummary);
router.get('/cash-flow', getReportCashFlow);
router.get('/category-breakdown', getReportCategoryBreakdown);

export default router;
