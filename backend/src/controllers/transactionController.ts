import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { FraudAlert } from '../models/FraudAlert';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { evaluateTransactionRisk } from '../services/aiService';


/**
 * @route   GET /api/transactions
 * @desc    Fetch filterable, searchable, and paginated transactions for authenticated user
 * @access  Private
 */
export async function getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const {
      type,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      sortBy = 'date-desc',
      page = '1',
      limit = '20'
    } = req.query;

    const query: any = { userId };

    // Filter: Type
    if (type && type !== 'all' && (type === 'income' || type === 'expense')) {
      query.type = type;
    }

    // Filter: Category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter: Date Range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(String(startDate));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Filter: Amount
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        const min = Number(minAmount);
        if (!isNaN(min)) query.amount.$gte = min;
      }
      if (maxAmount) {
        const max = Number(maxAmount);
        if (!isNaN(max)) query.amount.$lte = max;
      }
    }

    // Search query on title, description, or category
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ title: regex }, { description: regex }, { category: regex }];
    }

    // Sorting
    let sortOptions: any = { date: -1, _id: -1 };
    if (sortBy === 'date-asc') {
      sortOptions = { date: 1, _id: 1 };
    } else if (sortBy === 'amount-desc') {
      sortOptions = { amount: -1, date: -1 };
    } else if (sortBy === 'amount-asc') {
      sortOptions = { amount: 1, date: -1 };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Transaction.countDocuments(query)
    ]);

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
        transactions: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction by ID scoped to authenticated user
 * @access  Private
 */
export async function getTransactionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const tx = await Transaction.findOne({ _id: id, userId });
    if (!tx) {
      throw new AppError('Transaction record not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      data: {
        transaction: {
          id: tx._id,
          title: tx.title,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          date: tx.date.toISOString().split('T')[0],
          paymentMethod: tx.paymentMethod,
          description: tx.description,
          createdAt: tx.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/transactions
 * @desc    Record a new transaction for authenticated user
 * @access  Private
 */
export async function createTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { title, amount, type, category, date, paymentMethod, description } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError('Transaction title is required', 400, 'INVALID_TITLE');
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount must be a valid positive number', 400, 'INVALID_AMOUNT');
    }

    if (!type || !['income', 'expense'].includes(type)) {
      throw new AppError('Type must be either "income" or "expense"', 400, 'INVALID_TYPE');
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new AppError('Category is required', 400, 'INVALID_CATEGORY');
    }

    let txDate = new Date();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        txDate = parsed;
      }
    }

    const newTx = await Transaction.create({
      userId,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category: category.trim(),
      date: txDate,
      paymentMethod: (paymentMethod && String(paymentMethod).trim()) || 'UPI',
      description: description ? String(description).trim() : ''
    });

    // Query historical stats for AI anomaly scoring
    let userStats = { avgAmount: parsedAmount, stdDev: 0, count: 0 };
    let recentCategoryCount = 0;
    let fraudAlertCreated: any = null;
    try {
      const stats = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type } },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: '$amount' },
            stdDev: { $stdDevPop: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
      if (stats.length > 0) {
        userStats = {
          avgAmount: stats[0].avgAmount || parsedAmount,
          stdDev: stats[0].stdDev || 0,
          count: stats[0].count || 0
        };
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [catCount, vel24h, prevCategoryHistory, prevMerchantHistory] = await Promise.all([
        Transaction.countDocuments({
          userId,
          category: category.trim(),
          date: { $gte: oneDayAgo }
        }),
        Transaction.countDocuments({
          userId,
          date: { $gte: oneDayAgo }
        }),
        Transaction.countDocuments({
          userId,
          category: category.trim(),
          _id: { $ne: newTx._id }
        }),
        Transaction.countDocuments({
          userId,
          title: title.trim(),
          _id: { $ne: newTx._id }
        })
      ]);
      recentCategoryCount = catCount;
      const velocity24h = vel24h;
      const isNewCategory = userStats.count >= 5 && prevCategoryHistory === 0;
      const isNewMerchant = userStats.count >= 5 && prevMerchantHistory === 0;
      const hourOfDay = new Date().getHours();

      // Call FastAPI AI service with timeout guard (zero-crash guarantee)
      const aiAssessment = await evaluateTransactionRisk({
        amount: parsedAmount,
        type,
        category: category.trim(),
        title: title.trim(),
        paymentMethod: (paymentMethod && String(paymentMethod).trim()) || 'UPI',
        user_avg_amount: userStats.avgAmount,
        user_std_amount: userStats.stdDev,
        user_tx_count: userStats.count,
        recent_category_count: recentCategoryCount,
        velocity_24h_count: velocity24h,
        is_new_category: isNewCategory,
        is_new_merchant: isNewMerchant,
        hour_of_day: hourOfDay
      });

      if (aiAssessment.is_anomaly && aiAssessment.risk_score >= 60) {
        const alert = await FraudAlert.create({
          userId,
          transactionId: newTx._id,
          transactionTitle: newTx.title,
          amount: newTx.amount,
          riskScore: aiAssessment.risk_score,
          riskLevel: aiAssessment.risk_level,
          reasons: aiAssessment.reasons,
          status: 'pending_review'
        });
        fraudAlertCreated = {
          id: alert._id,
          riskScore: alert.riskScore,
          riskLevel: alert.riskLevel,
          reasons: alert.reasons
        };
      }
    } catch {
      // AI service failure never blocks transaction creation
    }

    return res.status(201).json({
      status: 'success',
      message: 'Transaction recorded successfully',
      data: {
        transaction: {
          id: newTx._id,
          title: newTx.title,
          amount: newTx.amount,
          type: newTx.type,
          category: newTx.category,
          date: newTx.date.toISOString().split('T')[0],
          paymentMethod: newTx.paymentMethod,
          description: newTx.description,
          createdAt: newTx.createdAt
        },
        fraudAlert: fraudAlertCreated
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/transactions/:id
 * @desc    Update an existing transaction scoped to authenticated user
 * @access  Private
 */
export async function updateTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, amount, type, category, date, paymentMethod, description } = req.body;

    const tx = await Transaction.findOne({ _id: id, userId });
    if (!tx) {
      throw new AppError('Transaction record not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    if (title && typeof title === 'string') tx.title = title.trim();
    if (amount !== undefined) {
      const parsed = Number(amount);
      if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0 || parsed > 100000000) {
        throw new AppError('Amount must be a valid positive number up to 100,000,000', 400, 'INVALID_AMOUNT');
      }
      tx.amount = parsed;
    }
    if (type && ['income', 'expense'].includes(type)) tx.type = type;
    if (category && typeof category === 'string') tx.category = category.trim();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) tx.date = parsed;
    }
    if (paymentMethod && typeof paymentMethod === 'string') tx.paymentMethod = paymentMethod.trim();
    if (description !== undefined) tx.description = String(description).trim();

    await tx.save();

    return res.status(200).json({
      status: 'success',
      message: 'Transaction updated successfully',
      data: {
        transaction: {
          id: tx._id,
          title: tx.title,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          date: tx.date.toISOString().split('T')[0],
          paymentMethod: tx.paymentMethod,
          description: tx.description,
          updatedAt: tx.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/transactions/:id/analyze
 * @desc    Request AI anomaly risk evaluation for a specific authorized transaction
 * @access  Private
 */
export async function analyzeTransactionRisk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const tx = await Transaction.findOne({ _id: id, userId });
    if (!tx) {
      throw new AppError('Transaction record not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    const stats = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: tx.type } },
      {
        $group: {
          _id: null,
          avgAmount: { $avg: '$amount' },
          stdDev: { $stdDevPop: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const userStats = stats[0] || { avgAmount: tx.amount, stdDev: 0, count: 1 };
    const txDate = tx.date ? new Date(tx.date) : new Date();
    const oneDayAgo = new Date(txDate.getTime() - 24 * 60 * 60 * 1000);

    const [velocity24h, prevCatCount, prevMerchantCount] = await Promise.all([
      Transaction.countDocuments({
        userId,
        date: { $gte: oneDayAgo, $lte: txDate }
      }),
      Transaction.countDocuments({
        userId,
        category: tx.category,
        date: { $lt: txDate }
      }),
      Transaction.countDocuments({
        userId,
        title: tx.title,
        date: { $lt: txDate }
      })
    ]);

    const assessment = await evaluateTransactionRisk({
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      title: tx.title,
      paymentMethod: tx.paymentMethod,
      user_avg_amount: userStats.avgAmount,
      user_std_amount: userStats.stdDev,
      user_tx_count: userStats.count,
      velocity_24h_count: velocity24h,
      is_new_category: userStats.count >= 5 && prevCatCount === 0,
      is_new_merchant: userStats.count >= 5 && prevMerchantCount === 0,
      hour_of_day: txDate.getHours()
    });

    return res.status(200).json({
      status: 'success',
      data: {
        transactionId: tx._id,
        assessment
      }
    });
  } catch (error) {
    next(error);
  }
}


/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete a transaction scoped to authenticated user
 * @access  Private
 */
export async function deleteTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await Transaction.findOneAndDelete({ _id: id, userId });
    if (!result) {
      throw new AppError('Transaction record not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}
