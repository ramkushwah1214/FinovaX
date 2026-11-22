import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { RecurringPayment } from '../models/RecurringPayment';
import { FraudAlert } from '../models/FraudAlert';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @route   GET /api/dashboard/summary
 * @desc    Aggregate all-time balance, monthly inflow/outflow, and zero-safe savings rate from actual MongoDB records
 * @access  Private
 */
export async function getDashboardSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      allTimeSums,
      monthlySums,
      totalTxCount,
      pendingBillsCount,
      unresolvedFraudCount
    ] = await Promise.all([
      // All-time income and expenses (excluding internal transfers)
      Transaction.aggregate([
        {
          $match: {
            userId,
            transactionType: { $ne: 'transfer' }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Current month income and expenses (excluding internal transfers)
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            transactionType: { $ne: 'transfer' }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Total transaction count
      Transaction.countDocuments({ userId }),

      // Pending recurring payments
      RecurringPayment.countDocuments({
        userId,
        status: { $in: ['pending', 'overdue'] }
      }),

      // Unresolved fraud alerts
      FraudAlert.countDocuments({
        userId,
        status: 'pending_review'
      })
    ]);

    // Parse all-time sums
    let totalAllIncome = 0;
    let totalAllExpenses = 0;
    allTimeSums.forEach(item => {
      if (item._id === 'income') totalAllIncome = item.total;
      if (item._id === 'expense') totalAllExpenses = item.total;
    });

    // Parse monthly sums
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    monthlySums.forEach(item => {
      if (item._id === 'income') monthlyIncome = item.total;
      if (item._id === 'expense') monthlyExpenses = item.total;
    });

    const netBalance = totalAllIncome - totalAllExpenses;

    // Safe savings rate calculation (avoids division by zero)
    let savingsRate = 0;
    if (monthlyIncome > 0) {
      const rate = Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100);
      savingsRate = Math.max(0, rate);
    }

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalBalance: netBalance,
          totalIncome: totalAllIncome,
          totalExpenses: totalAllExpenses,
          monthlyIncome,
          monthlyExpenses,
          savingsRate,
          totalTransactions: totalTxCount,
          pendingBillsCount,
          unresolvedFraudCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/dashboard/cashflow AND /api/dashboard/cash-flow
 * @desc    Aggregate multi-month cashflow progression from real transaction history
 * @access  Private
 */
export async function getDashboardCashFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);

    // Look back last 6 calendar months
    const now = new Date();
    const monthsBack = 6;
    const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1, 0, 0, 0, 0);

    const aggResults = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate },
          transactionType: { $ne: 'transfer' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Pre-index aggregation results into a Map for O(1) month lookups instead of nested iterations: O(K)
    const flowMap = new Map<string, number>();
    aggResults.forEach(item => {
      flowMap.set(`${item._id.year}-${item._id.month}-${item._id.type}`, item.total);
    });

    // Build timeline of last 6 months with real sums in O(monthsBack)
    const cashFlowData: Array<{ month: string; income: number; expenses: number; net: number }> = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-12
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });

      const inc = flowMap.get(`${y}-${m}-income`) || 0;
      const exp = flowMap.get(`${y}-${m}-expense`) || 0;

      cashFlowData.push({
        month: monthLabel,
        income: inc,
        expenses: exp,
        net: inc - exp
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        cashFlow: cashFlowData
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/dashboard/categories AND /api/dashboard/expenses-by-category
 * @desc    Aggregate current month expense distribution by category
 * @access  Private
 */
export async function getDashboardExpensesByCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const results = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
          transactionType: { $ne: 'transfer' }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    const formatted = results.map(r => ({
      category: r._id,
      name: r._id,
      amount: r.totalAmount,
      value: r.totalAmount,
      count: r.count
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        categories: formatted,
        expensesByCategory: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/dashboard/recent-transactions
 * @desc    Fetch latest 5 transactions for dashboard table
 * @access  Private
 */
export async function getDashboardRecentTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    const transactions = await Transaction.find({ userId })
      .select('_id title amount type category date paymentMethod description createdAt')
      .sort({ date: -1, _id: -1 })
      .limit(5)
      .lean();

    const formatted = transactions.map(t => ({
      id: t._id,
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date.toISOString().split('T')[0],
      paymentMethod: t.paymentMethod,
      description: t.description,
      createdAt: t.createdAt
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        transactions: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}
