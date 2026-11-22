import { Response, NextFunction } from 'express';
import { FinancialGoal } from '../models/FinancialGoal';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

/**
 * @route   GET /api/goals
 * @desc    Get user's financial goals
 * @access  Private
 */
export async function getGoals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const goals = await FinancialGoal.find({ userId }).sort({ targetDate: 1 }).lean();

    const formatted = goals.map(g => ({
      id: g._id,
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate.toISOString().split('T')[0],
      status: g.status,
      category: g.category || 'Savings',
      createdAt: g.createdAt
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        goals: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/goals
 * @desc    Create a new financial goal
 * @access  Private
 */
export async function createGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { title, targetAmount, currentAmount = 0, targetDate, category } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError('Goal title is required', 400, 'INVALID_TITLE');
    }

    const parsedTarget = Number(targetAmount);
    if (isNaN(parsedTarget) || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      throw new AppError('Target amount must be a positive number', 400, 'INVALID_TARGET');
    }

    const parsedCurrent = Number(currentAmount);
    if (isNaN(parsedCurrent) || !Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      throw new AppError('Current amount cannot be negative', 400, 'INVALID_CURRENT');
    }

    if (!targetDate) {
      throw new AppError('Target deadline date is required', 400, 'INVALID_TARGET_DATE');
    }

    const dateObj = new Date(targetDate);
    if (isNaN(dateObj.getTime())) {
      throw new AppError('Invalid target date format', 400, 'INVALID_DATE');
    }

    const newGoal = await FinancialGoal.create({
      userId,
      title: title.trim(),
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
      targetDate: dateObj,
      category: category ? String(category).trim() : 'Savings',
      status: parsedCurrent >= parsedTarget ? 'completed' : 'in_progress'
    });

    return res.status(201).json({
      status: 'success',
      message: 'Financial goal created successfully',
      data: {
        goal: {
          id: newGoal._id,
          title: newGoal.title,
          targetAmount: newGoal.targetAmount,
          currentAmount: newGoal.currentAmount,
          targetDate: newGoal.targetDate.toISOString().split('T')[0],
          status: newGoal.status,
          category: newGoal.category,
          createdAt: newGoal.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/goals/:id
 * @desc    Update goal or add contribution
 * @access  Private
 */
export async function updateGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, targetAmount, currentAmount, contributionAmount, targetDate, status, category } = req.body;

    const goal = await FinancialGoal.findOne({ _id: id, userId });
    if (!goal) {
      throw new AppError('Financial goal not found', 404, 'GOAL_NOT_FOUND');
    }

    if (title && typeof title === 'string') goal.title = title.trim();
    if (targetAmount !== undefined) {
      const parsed = Number(targetAmount);
      if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0 || parsed > 1000000000) {
        throw new AppError('Target amount must be a positive finite number', 400, 'INVALID_AMOUNT');
      }
      goal.targetAmount = parsed;
    }
    if (currentAmount !== undefined) {
      const parsed = Number(currentAmount);
      if (isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0 || parsed > 1000000000) {
        throw new AppError('Current amount must be a non-negative finite number', 400, 'INVALID_AMOUNT');
      }
      goal.currentAmount = parsed;
    }
    // Support quick contribution
    if (contributionAmount !== undefined) {
      const parsed = Number(contributionAmount);
      if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0 || parsed > 1000000000) {
        throw new AppError('Contribution amount must be a positive finite number', 400, 'INVALID_AMOUNT');
      }
      goal.currentAmount += parsed;
    }
    if (targetDate) {
      const parsed = new Date(targetDate);
      if (!isNaN(parsed.getTime())) goal.targetDate = parsed;
    }
    if (category && typeof category === 'string') goal.category = category.trim();

    // Auto-update status if target reached
    if (status && ['in_progress', 'completed', 'cancelled'].includes(status)) {
      goal.status = status;
    } else if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    } else {
      goal.status = 'in_progress';
    }

    await goal.save();

    return res.status(200).json({
      status: 'success',
      message: 'Financial goal updated successfully',
      data: {
        goal: {
          id: goal._id,
          title: goal.title,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate.toISOString().split('T')[0],
          status: goal.status,
          category: goal.category,
          updatedAt: goal.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/goals/:id
 * @desc    Delete a financial goal
 * @access  Private
 */
export async function deleteGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await FinancialGoal.findOneAndDelete({ _id: id, userId });
    if (!result) {
      throw new AppError('Financial goal not found', 404, 'GOAL_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Financial goal deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}
