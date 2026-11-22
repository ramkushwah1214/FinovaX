import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { AuthenticatedRequest } from '../middleware/auth';

function getDateRangeFilter(range: string) {
  const now = new Date();
  let startDate: Date | null = null;
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (range) {
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'all':
      startDate = null;
      break;
    case '30d':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

/**
 * @route   GET /api/reports/summary
 * @desc    Aggregate report summary (inflow, outflow, net savings, savings rate) for date window
 * @access  Private
 */
export async function getReportSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);
    const range = String(req.query.range || '30d');
    const { startDate, endDate } = getDateRangeFilter(range);

    const matchQuery: any = { userId };
    if (startDate) {
      matchQuery.date = { $gte: startDate, $lte: endDate };
    }

    // Single-pass aggregation computing totals and transaction counts in one database scan: O(K)
    const sums = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let grossInflow = 0;
    let grossOutflow = 0;
    let totalCount = 0;

    sums.forEach(item => {
      totalCount += item.count || 0;
      if (item._id === 'income') grossInflow = item.total;
      if (item._id === 'expense') grossOutflow = item.total;
    });

    const netSavings = grossInflow - grossOutflow;
    let savingsRate = 0;
    if (grossInflow > 0) {
      savingsRate = Math.max(0, Math.round((netSavings / grossInflow) * 100));
    }

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          grossInflow,
          grossOutflow,
          netSavings,
          savingsRate,
          transactionCount: totalCount,
          range,
          startDate: startDate ? startDate.toISOString().split('T')[0] : null,
          endDate: endDate.toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/reports/cash-flow
 * @desc    Monthly cashflow progression breakdown within report date window
 * @access  Private
 */
export async function getReportCashFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);
    const range = String(req.query.range || '30d');
    const { startDate, endDate } = getDateRangeFilter(range);

    const matchQuery: any = { userId };
    if (startDate) {
      matchQuery.date = { $gte: startDate, $lte: endDate };
    }

    const aggResults = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Group by month
    const monthMap = new Map<string, { period: string; income: number; expense: number; savings: number }>();

    aggResults.forEach(item => {
      const year = item._id.year;
      const month = item._id.month;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const periodLabel = `${new Date(year, month - 1).toLocaleString('en-US', { month: 'short' })} ${year}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { period: periodLabel, income: 0, expense: 0, savings: 0 });
      }

      const entry = monthMap.get(key)!;
      if (item._id.type === 'income') entry.income += item.total;
      if (item._id.type === 'expense') entry.expense += item.total;
      entry.savings = entry.income - entry.expense;
    });

    const progression = Array.from(monthMap.values());

    return res.status(200).json({
      status: 'success',
      data: {
        progression
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/reports/category-breakdown
 * @desc    Category-wise expense breakdown with percentages for report window
 * @access  Private
 */
export async function getReportCategoryBreakdown(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);
    const range = String(req.query.range || '30d');
    const { startDate, endDate } = getDateRangeFilter(range);

    const matchQuery: any = { userId, type: 'expense' };
    if (startDate) {
      matchQuery.date = { $gte: startDate, $lte: endDate };
    }

    const categories = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { amount: -1 }
      }
    ]);

    const totalExpense = categories.reduce((sum, c) => sum + c.amount, 0);

    const formatted = categories.map(c => ({
      category: c._id,
      amount: c.amount,
      count: c.count,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        totalExpense,
        categories: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}
