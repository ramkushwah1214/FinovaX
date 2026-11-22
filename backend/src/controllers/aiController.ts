import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import { RecurringPayment } from '../models/RecurringPayment';
import {
  getAiModelStatus,
  predictTransactionCategory,
  evaluateTransactionRisk,
  predictSpendingForecast,
  predictCustomerSegmentation,
  sendCategoryCorrection,
  triggerModelRetraining
} from '../services/aiService';

/**
 * @route   GET /api/ai/model-status
 * @desc    Get status of all 4 AI/ML models
 * @access  Private
 */
export async function getModelStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const status = await getAiModelStatus();
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/ai/categorize
 * @desc    Predict category for transaction description
 * @access  Private
 */
export async function categorize(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { title, amount, direction } = req.body;
    const result = await predictTransactionCategory({ title, amount: Number(amount) || 0, direction });
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/ai/fraud-check
 * @desc    Analyze risk of a single transaction
 * @access  Private
 */
export async function fraudCheck(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(rawUserId || '')
      ? new mongoose.Types.ObjectId(rawUserId)
      : rawUserId;
    const { amount, type, category, title, paymentMethod } = req.body;

    // Compute user baseline
    const stats = await Transaction.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: null,
          avgAmount: { $avg: '$amount' },
          stdAmount: { $stdDevPop: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const userStats = stats[0] || { avgAmount: 0, stdAmount: 0, count: 0 };

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [vel24h, prevCatCount, prevMerchantCount] = await Promise.all([
      Transaction.countDocuments({ userId: userObjectId, date: { $gte: oneDayAgo } }),
      Transaction.countDocuments({ userId: userObjectId, category: category || 'Other' }),
      Transaction.countDocuments({ userId: userObjectId, title: title || 'Transaction' })
    ]);

    const assessment = await evaluateTransactionRisk({
      amount: Number(amount) || 0,
      type: type || 'expense',
      category: category || 'Other',
      title: title || 'Transaction',
      paymentMethod,
      user_avg_amount: userStats.avgAmount,
      user_std_amount: userStats.stdAmount || 0,
      user_tx_count: userStats.count,
      velocity_24h_count: vel24h,
      is_new_category: userStats.count >= 5 && prevCatCount === 0,
      is_new_merchant: userStats.count >= 5 && prevMerchantCount === 0,
      hour_of_day: now.getHours()
    });

    res.status(200).json({
      status: 'success',
      data: assessment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/ai/forecast
 * @desc    Generate spending forecast from authenticated user's actual MongoDB transactions
 * @access  Private
 */
export async function getForecast(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(rawUserId || '')
      ? new mongoose.Types.ObjectId(rawUserId)
      : rawUserId;

    // Aggregate monthly spending from actual transactions
    const monthlyAggs = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'expense',
          transactionType: { $ne: 'transfer' } // Transfer between own accounts not counted!
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const history = monthlyAggs.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      amount: Math.round(m.total)
    }));

    const forecastResult = await predictSpendingForecast(history);

    res.status(200).json({
      status: 'success',
      data: {
        ...forecastResult,
        monthsEvaluated: history.length,
        history
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/ai/segmentation
 * @desc    Generate customer spending persona and segment from actual user transactions
 * @access  Private
 */
export async function getSegmentation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(rawUserId || '')
      ? new mongoose.Types.ObjectId(rawUserId)
      : rawUserId;

    const [txSummary, userProfile] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
            totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            count: { $sum: 1 },
            essentialExpense: {
              $sum: {
                $cond: [
                  { $in: ['$category', ['Bills', 'Groceries', 'Rent', 'Healthcare', 'Education', 'Fuel']] },
                  '$amount',
                  0
                ]
              }
            },
            discretionaryExpense: {
              $sum: {
                $cond: [
                  { $in: ['$category', ['Food', 'Shopping', 'Entertainment', 'Travel', 'Subscriptions']] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]),
      req.user
    ]);

    const data = txSummary[0];
    if (!data || data.count === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          status: 'INSUFFICIENT_DATA',
          persona: 'Emerging Financial Profile',
          message: 'Please import or record financial transactions to generate your behavioral spending segment.'
        }
      });
    }

    const totalExp = data.totalExpense || 1;
    const essentialRatio = Number((data.essentialExpense / totalExp).toFixed(2));
    const discretionaryRatio = Number((data.discretionaryExpense / totalExp).toFixed(2));
    const monthlyAvgSpend = Math.round(data.totalExpense);
    const savingsRate = data.totalIncome > data.totalExpense ? Number(((data.totalIncome - data.totalExpense) / data.totalIncome).toFixed(2)) : 0;
    const avgTxAmount = Math.round(totalExp / Math.max(1, data.count));

    const recurringCount = await RecurringPayment.countDocuments({ userId: userObjectId, isActive: true });
    const recurringRatio = Number(Math.min(1.0, (recurringCount * 0.05)).toFixed(2));

    const segmentation = await predictCustomerSegmentation({
      monthlyAvgSpend,
      essentialRatio,
      discretionaryRatio,
      transactionFrequency: data.count,
      savingsRate,
      avgTxAmount,
      recurringRatio
    });

    res.status(200).json({
      status: 'success',
      data: segmentation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/ai/category-correction
 * @desc    Submit user category correction to improve AI retraining data
 * @access  Private
 */
export async function recordCategoryCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { title, category, previousCategory } = req.body;
    const userId = req.user?.id;

    if (!title || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Transaction title and corrected category are required.'
      });
    }

    const result = await sendCategoryCorrection({
      title,
      category,
      previousCategory,
      userId
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/ai/retrain
 * @desc    Trigger model retraining across active learning pipelines
 * @access  Private
 */
export async function retrainModels(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { models } = req.body;
    const result = await triggerModelRetraining(models);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

