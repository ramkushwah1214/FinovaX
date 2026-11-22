import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { FinancialGoal } from '../models/FinancialGoal';
import { RecurringPayment } from '../models/RecurringPayment';
import { FraudAlert } from '../models/FraudAlert';
import { StatementImport } from '../models/StatementImport';
import { BankAccount } from '../models/BankAccount';
import { BankConnection } from '../models/BankConnection';
import { ConsentRecord } from '../models/ConsentRecord';
import { FinancialInsight } from '../models/FinancialInsight';
import { SpendingForecast } from '../models/SpendingForecast';
import { SpendingSegment } from '../models/SpendingSegment';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Validates password strength according to project security specifications.
 * Requirements: >= 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special symbol.
 */
export function isStrongPassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /[\W_]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
}

/**
 * Strict RFC 5322 compliant email validator
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

/**
 * Generates an encrypted JWT token with a 7-day expiration
 */
export function generateToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    ENV.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );
}

/**
 * Sets the secure authentication cookie
 */
export function setAuthCookie(res: Response, token: string) {
  const isProduction = ENV.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
  res.cookie('finovax_token', token, cookieOptions);
  res.cookie('token', token, cookieOptions);
}

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new user account with hashed password
 * @access  Public
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, phone, currency, monthlyIncome } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Full name is required', 400, 'VALIDATION_ERROR');
    }

    if (!email || !isValidEmail(email)) {
      throw new AppError('A valid email address is required', 400, 'INVALID_EMAIL');
    }

    if (!password || !isStrongPassword(password)) {
      throw new AppError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        400,
        'WEAK_PASSWORD'
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409, 'USER_EXISTS');
    }

    // Salt and hash the password using bcrypt with standard work factor of 12
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: IUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      phone: phone ? String(phone).trim() : '',
      currency: currency && ['INR', 'USD', 'EUR', 'GBP'].includes(currency) ? currency : 'INR',
      monthlyIncome: typeof monthlyIncome === 'number' && monthlyIncome >= 0 ? monthlyIncome : 0,
      notifications: {
        fraudAlerts: true,
        budgetThresholds: true,
        billReminders: true,
        weeklyReports: false
      }
    });

    const token = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name
    });

    setAuthCookie(res, token);

    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully',
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          currency: newUser.currency,
          monthlyIncome: newUser.monthlyIncome,
          notifications: newUser.notifications,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates credentials and establishes JWT session
 * @access  Public
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide both email address and password', 400, 'MISSING_CREDENTIALS');
    }

    const cleanEmail = email.toLowerCase().trim();

    // Select the passwordHash explicitly
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Constant-time password comparison
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });

    setAuthCookie(res, token);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          currency: user.currency,
          monthlyIncome: user.monthlyIncome,
          notifications: user.notifications,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/logout
 * @desc    Clears authentication cookie
 * @access  Public
 */
export async function logout(_req: Request, res: Response) {
  const isProduction = ENV.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  });

  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('-passwordHash');

    if (!user) {
      throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          currency: user.currency,
          monthlyIncome: user.monthlyIncome,
          notifications: user.notifications,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update authenticated user settings & preferences
 * @access  Private
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { name, phone, currency, monthlyIncome, notifications } = req.body;

    const updateFields: any = {};
    if (name && typeof name === 'string') {
      const trimmed = name.trim();
      if (trimmed.length >= 2 && trimmed.length <= 100) {
        updateFields.name = trimmed;
      }
    }
    if (phone !== undefined) {
      updateFields.phone = String(phone).trim().slice(0, 30);
    }
    if (currency && ['INR', 'USD', 'EUR', 'GBP'].includes(currency)) {
      updateFields.currency = currency;
    }
    if (monthlyIncome !== undefined) {
      const parsed = Number(monthlyIncome);
      if (!isNaN(parsed) && Number.isFinite(parsed) && parsed >= 0) {
        updateFields.monthlyIncome = parsed;
      }
    }
    if (notifications && typeof notifications === 'object') {
      updateFields.notifications = notifications;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Profile preferences updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          currency: updatedUser.currency,
          monthlyIncome: updatedUser.monthlyIncome,
          notifications: updatedUser.notifications
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generates password reset token
 * @access  Public
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      throw new AppError('Please provide a valid registered email address', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'If the email is registered, password reset instructions have been issued.'
      });
    }

    const resetToken = jwt.sign(
      { id: user._id, email: user.email, purpose: 'pwd_reset' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password reset token generated successfully. In production, this link is emailed securely.',
      data: {
        resetToken,
        expiresIn: '1 hour'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/reset-password
 * @desc    Resets user password with valid reset token
 * @access  Public
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AppError('Reset token and new password are required', 400);
    }

    if (!isStrongPassword(newPassword)) {
      throw new AppError('Password must contain at least 8 characters, with uppercase, lowercase, numbers, and symbols', 400);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch {
      throw new AppError('Invalid or expired reset token. Please request a new link.', 401);
    }

    if (decoded.purpose !== 'pwd_reset') {
      throw new AppError('Invalid token purpose', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(decoded.id, { passwordHash });

    return res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/auth/account
 * @desc    Permanently delete the authenticated user account and all associated financial records
 * @access  Private (Strict JWT authentication + current password re-verification + explicit confirmation)
 */
export async function deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let session: mongoose.ClientSession | null = null;
  let useTransaction = false;

  try {
    const rawUserId = req.user?.id;
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(rawUserId)) {
      throw new AppError('Unauthorized: Valid authenticated session required', 401, 'UNAUTHORIZED');
    }

    const userObjectId = new mongoose.Types.ObjectId(rawUserId);
    const { password, confirmText } = req.body;

    // 1. Explicit confirmation check (Must type 'DELETE')
    if (confirmText !== 'DELETE') {
      throw new AppError('Explicit confirmation required: Please type "DELETE" to confirm permanent account deletion.', 400, 'INVALID_CONFIRMATION_TEXT');
    }

    // 2. Re-authentication with current password
    if (!password || typeof password !== 'string') {
      throw new AppError('Current password is required to authorize account deletion.', 400, 'PASSWORD_REQUIRED');
    }

    const user = await User.findById(userObjectId).select('+passwordHash');
    if (!user) {
      throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Incorrect password. Account deletion aborted for security.', 401, 'INVALID_CREDENTIALS');
    }

    // 3. Initiate MongoDB session & transaction if supported by replica set
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch {
      session = null;
      useTransaction = false;
    }

    const sessionOpts = session && useTransaction ? { session } : {};

    // 4. Revoke active bank connections and consents before deletion
    await BankConnection.updateMany(
      { userId: userObjectId },
      { status: 'revoked' },
      sessionOpts
    );
    await ConsentRecord.updateMany(
      { userId: userObjectId },
      { status: 'REVOKED', revokedAt: new Date() },
      sessionOpts
    );

    // 5. Cascade permanent deletion across all user-owned financial collections
    // Child security alerts & analytics
    await FraudAlert.deleteMany({ userId: userObjectId }, sessionOpts);
    await FinancialInsight.deleteMany({ userId: userObjectId }, sessionOpts);
    await SpendingForecast.deleteMany({ userId: userObjectId }, sessionOpts);
    await SpendingSegment.deleteMany({ userId: userObjectId }, sessionOpts);

    // Budgets, goals, and recurring payment obligations
    await Budget.deleteMany({ userId: userObjectId }, sessionOpts);
    await FinancialGoal.deleteMany({ userId: userObjectId }, sessionOpts);
    await RecurringPayment.deleteMany({ userId: userObjectId }, sessionOpts);

    // Core financial ledger & raw statement batches
    await Transaction.deleteMany({ userId: userObjectId }, sessionOpts);
    await StatementImport.deleteMany({ userId: userObjectId }, sessionOpts);

    // Bank accounts, connections, and consent audit records
    await BankAccount.deleteMany({ userId: userObjectId }, sessionOpts);
    await ConsentRecord.deleteMany({ userId: userObjectId }, sessionOpts);
    await BankConnection.deleteMany({ userId: userObjectId }, sessionOpts);

    // 6. Delete user account document permanently
    await User.deleteOne({ _id: userObjectId }, sessionOpts);

    if (session && useTransaction) {
      await session.commitTransaction();
      session.endSession();
      session = null;
    }

    // 7. Invalidate authentication cookies
    const isProduction = ENV.NODE_ENV === 'production';
    res.clearCookie('finovax_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/'
    });
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/'
    });

    return res.status(200).json({
      status: 'success',
      message: 'Your FinovaX account and all associated financial records have been permanently deleted.',
      data: {
        deleted: true
      }
    });
  } catch (error) {
    if (session && useTransaction) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {}
    }
    next(error);
  }
}
