import { Response, NextFunction } from 'express';
import { RecurringPayment } from '../models/RecurringPayment';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

/**
 * @route   GET /api/recurring-payments
 * @desc    Get user's bills and recurring EMI obligations
 * @access  Private
 */
export async function getRecurringPayments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    const query: any = { userId };
    if (status && status !== 'all' && ['pending', 'paid', 'overdue'].includes(String(status))) {
      query.status = status;
    }

    const payments = await RecurringPayment.find(query).sort({ dueDate: 1 }).lean();

    const formatted = payments.map(p => ({
      id: p._id,
      title: p.name,
      name: p.name,
      amount: p.amount,
      category: p.category,
      frequency: p.frequency,
      dueDate: p.dueDate.toISOString().split('T')[0],
      status: p.status,
      provider: p.provider || '',
      autoDebit: p.autoDebit,
      createdAt: p.createdAt
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        payments: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/recurring-payments
 * @desc    Create a new recurring payment / bill / EMI
 * @access  Private
 */
export async function createRecurringPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { title, name, amount, category, frequency = 'monthly', dueDate, provider, autoDebit = false } = req.body;

    const paymentName = (name || title || '').trim();
    if (!paymentName) {
      throw new AppError('Payment name / title is required', 400, 'INVALID_NAME');
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Payment amount must be a positive number', 400, 'INVALID_AMOUNT');
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new AppError('Category is required', 400, 'INVALID_CATEGORY');
    }

    if (!dueDate) {
      throw new AppError('Due date is required', 400, 'INVALID_DUE_DATE');
    }

    const dateObj = new Date(dueDate);
    if (isNaN(dateObj.getTime())) {
      throw new AppError('Invalid due date format', 400, 'INVALID_DATE');
    }

    const newPayment = await RecurringPayment.create({
      userId,
      name: paymentName,
      amount: parsedAmount,
      category: category.trim(),
      frequency: ['weekly', 'monthly', 'yearly'].includes(frequency) ? frequency : 'monthly',
      dueDate: dateObj,
      provider: provider ? String(provider).trim() : '',
      autoDebit: Boolean(autoDebit),
      status: 'pending'
    });

    return res.status(201).json({
      status: 'success',
      message: 'Recurring payment created successfully',
      data: {
        payment: {
          id: newPayment._id,
          title: newPayment.name,
          name: newPayment.name,
          amount: newPayment.amount,
          category: newPayment.category,
          frequency: newPayment.frequency,
          dueDate: newPayment.dueDate.toISOString().split('T')[0],
          status: newPayment.status,
          provider: newPayment.provider,
          autoDebit: newPayment.autoDebit,
          createdAt: newPayment.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/recurring-payments/:id
 * @desc    Update recurring payment details or mark status
 * @access  Private
 */
export async function updateRecurringPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, name, amount, category, frequency, dueDate, status, provider, autoDebit } = req.body;

    const payment = await RecurringPayment.findOne({ _id: id, userId });
    if (!payment) {
      throw new AppError('Recurring payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (name || title) payment.name = (name || title).trim();
    if (amount !== undefined) {
      const parsed = Number(amount);
      if (isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0 || parsed > 100000000) {
        throw new AppError('Amount must be a positive finite number up to 100,000,000', 400, 'INVALID_AMOUNT');
      }
      payment.amount = parsed;
    }
    if (category) payment.category = category.trim();
    if (frequency && ['weekly', 'monthly', 'yearly'].includes(frequency)) payment.frequency = frequency;
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) payment.dueDate = parsed;
    }
    if (status && ['pending', 'paid', 'overdue'].includes(status)) payment.status = status;
    if (provider !== undefined) payment.provider = String(provider).trim();
    if (autoDebit !== undefined) payment.autoDebit = Boolean(autoDebit);

    await payment.save();

    return res.status(200).json({
      status: 'success',
      message: 'Recurring payment updated successfully',
      data: {
        payment: {
          id: payment._id,
          title: payment.name,
          name: payment.name,
          amount: payment.amount,
          category: payment.category,
          frequency: payment.frequency,
          dueDate: payment.dueDate.toISOString().split('T')[0],
          status: payment.status,
          provider: payment.provider,
          autoDebit: payment.autoDebit,
          updatedAt: payment.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/recurring-payments/:id
 * @desc    Delete a recurring payment
 * @access  Private
 */
export async function deleteRecurringPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await RecurringPayment.findOneAndDelete({ _id: id, userId });
    if (!result) {
      throw new AppError('Recurring payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Recurring payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}
