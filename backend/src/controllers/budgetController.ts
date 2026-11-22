import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

/**
 * @route   GET /api/budgets
 * @desc    Get user's monthly budgets with live computed spent amounts from actual transactions
 * @access  Private
 */
export async function getBudgets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const now = new Date();
    const month = parseInt(String(req.query.month || (now.getMonth() + 1)), 10);
    const year = parseInt(String(req.query.year || now.getFullYear()), 10);

    const budgets = await Budget.find({ userId, month, year }).lean();

    if (budgets.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          budgets: [],
          month,
          year
        }
      });
    }

    // Compute actual spent amount per category for the current month window
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const expenseSums = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: { $toLower: '$category' },
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    const spentMap = new Map<string, number>();
    expenseSums.forEach(item => {
      spentMap.set(String(item._id).toLowerCase(), item.totalSpent);
    });

    const formattedBudgets = budgets.map(b => {
      const spent = spentMap.get(b.category.toLowerCase()) || 0;
      return {
        id: b._id,
        category: b.category,
        allocated: b.limitAmount,
        limitAmount: b.limitAmount,
        spent,
        month: b.month,
        year: b.year,
        period: `${new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })} ${year}`,
        createdAt: b.createdAt
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        budgets: formattedBudgets,
        month,
        year
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/budgets
 * @desc    Create a new category budget for authenticated user
 * @access  Private
 */
export async function createBudget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { category, limitAmount, month, year } = req.body;

    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new AppError('Budget category is required', 400, 'INVALID_CATEGORY');
    }

    const parsedLimit = Number(limitAmount);
    if (isNaN(parsedLimit) || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      throw new AppError('Limit amount must be a positive number', 400, 'INVALID_LIMIT');
    }

    const now = new Date();
    const budgetMonth = month !== undefined ? parseInt(String(month), 10) : now.getMonth() + 1;
    const budgetYear = year !== undefined ? parseInt(String(year), 10) : now.getFullYear();

    if (budgetMonth < 1 || budgetMonth > 12) {
      throw new AppError('Month must be between 1 and 12', 400, 'INVALID_MONTH');
    }

    // Check duplicate
    const existing = await Budget.findOne({
      userId,
      month: budgetMonth,
      year: budgetYear,
      category: { $regex: new RegExp(`^${category.trim()}$`, 'i') }
    });

    if (existing) {
      throw new AppError(`A budget for category "${category.trim()}" already exists for ${budgetMonth}/${budgetYear}`, 409, 'DUPLICATE_BUDGET');
    }

    const newBudget = await Budget.create({
      userId,
      category: category.trim(),
      limitAmount: parsedLimit,
      month: budgetMonth,
      year: budgetYear
    });

    return res.status(201).json({
      status: 'success',
      message: 'Budget created successfully',
      data: {
        budget: {
          id: newBudget._id,
          category: newBudget.category,
          allocated: newBudget.limitAmount,
          limitAmount: newBudget.limitAmount,
          spent: 0,
          month: newBudget.month,
          year: newBudget.year,
          period: `${new Date(budgetYear, budgetMonth - 1).toLocaleString('en-US', { month: 'long' })} ${budgetYear}`,
          createdAt: newBudget.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/budgets/:id
 * @desc    Update budget limit amount
 * @access  Private
 */
export async function updateBudget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { limitAmount } = req.body;

    const parsedLimit = Number(limitAmount);
    if (isNaN(parsedLimit) || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      throw new AppError('Limit amount must be a positive number', 400, 'INVALID_LIMIT');
    }

    const budget = await Budget.findOneAndUpdate(
      { _id: id, userId },
      { $set: { limitAmount: parsedLimit } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!budget) {
      throw new AppError('Budget not found', 404, 'BUDGET_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Budget updated successfully',
      data: {
        budget: {
          id: budget._id,
          category: budget.category,
          allocated: budget.limitAmount,
          limitAmount: budget.limitAmount,
          month: budget.month,
          year: budget.year,
          updatedAt: budget.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete a budget
 * @access  Private
 */
export async function deleteBudget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await Budget.findOneAndDelete({ _id: id, userId });
    if (!result) {
      throw new AppError('Budget not found', 404, 'BUDGET_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}
