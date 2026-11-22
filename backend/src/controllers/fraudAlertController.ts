import { Response, NextFunction } from 'express';
import { FraudAlert } from '../models/FraudAlert';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

/**
 * @route   GET /api/fraud-alerts
 * @desc    Get genuine fraud alert records for authenticated user
 * @access  Private
 */
export async function getFraudAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const alerts = await FraudAlert.find({ userId }).sort({ createdAt: -1 }).lean();

    const formatted = alerts.map(a => ({
      id: a._id,
      transactionId: a.transactionId,
      transactionTitle: a.transactionTitle || 'Monitored Transaction',
      amount: a.amount || 0,
      riskScore: a.riskScore,
      riskLevel: a.riskLevel,
      reasons: a.reasons,
      reason: a.reasons.join('; '),
      status: a.status,
      createdAt: a.createdAt
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        alerts: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/fraud-alerts/:id
 * @desc    Get single fraud alert by ID
 * @access  Private
 */
export async function getFraudAlertById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const alert = await FraudAlert.findOne({ _id: id, userId });
    if (!alert) {
      throw new AppError('Fraud alert record not found', 404, 'ALERT_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      data: {
        alert: {
          id: alert._id,
          transactionId: alert.transactionId,
          transactionTitle: alert.transactionTitle || 'Monitored Transaction',
          amount: alert.amount || 0,
          riskScore: alert.riskScore,
          riskLevel: alert.riskLevel,
          reasons: alert.reasons,
          reason: alert.reasons.join('; '),
          status: alert.status,
          createdAt: alert.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/fraud-alerts/:id
 * @desc    Resolve fraud alert status
 * @access  Private
 */
export async function updateFraudAlertStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['resolved_legitimate', 'confirmed_fraud', 'pending_review'].includes(status)) {
      throw new AppError('Invalid resolution status. Must be "resolved_legitimate" or "confirmed_fraud"', 400, 'INVALID_STATUS');
    }

    const alert = await FraudAlert.findOneAndUpdate(
      { _id: id, userId },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!alert) {
      throw new AppError('Fraud alert record not found', 404, 'ALERT_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Fraud alert resolved successfully',
      data: {
        alert: {
          id: alert._id,
          status: alert.status,
          updatedAt: alert.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
