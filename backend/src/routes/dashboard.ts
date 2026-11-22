import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardCashFlow,
  getDashboardExpensesByCategory,
  getDashboardRecentTransactions
} from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';

const router = Router();

router.use(checkDbReady);
router.use(authenticate);

// 1. Dashboard summary
router.get('/summary', getDashboardSummary);

// 2. Multi-month cash flow progression (support both /cashflow and /cash-flow)
router.get('/cashflow', getDashboardCashFlow);
router.get('/cash-flow', getDashboardCashFlow);

// 3. Category expense distribution (support both /categories and /expenses-by-category)
router.get('/categories', getDashboardExpensesByCategory);
router.get('/expenses-by-category', getDashboardExpensesByCategory);

// 4. Recent transactions
router.get('/recent-transactions', getDashboardRecentTransactions);

export default router;
