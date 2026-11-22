import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { BankConnection } from '../models/BankConnection';
import { ConsentRecord } from '../models/ConsentRecord';
import { BankAccount } from '../models/BankAccount';

/**
 * @route   GET /api/bank-connections
 * @desc    Fetch linked bank connections and active Account Aggregator consent records
 * @access  Private
 */
export async function getBankConnections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const [connections, consents, accounts] = await Promise.all([
      BankConnection.find({ userId }).populate('accountsLinked').lean(),
      ConsentRecord.find({ userId }).sort({ createdAt: -1 }).lean(),
      BankAccount.find({ userId }).lean()
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        providerMode: 'RBI_ACCOUNT_AGGREGATOR_SANDBOX',
        isLiveProviderConfigured: false, // Transparent disclosure: sandbox mode active
        connections,
        consents,
        accounts
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/bank-connections/initiate
 * @desc    Initiate an Account Aggregator consent flow (RBI AA framework compliant)
 * @access  Private
 */
export async function initiateConsent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { institutionName, purposeDescription, validityDays = 180 } = req.body;

    if (!institutionName || typeof institutionName !== 'string') {
      return next(new AppError('Institution name is required to initiate connection', 400));
    }

    const consentHandle = `AA_CONSENT_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const now = new Date();
    const expiry = new Date(now.getTime() + Number(validityDays) * 24 * 60 * 60 * 1000);

    // Create BankConnection in pending state
    const connection = await BankConnection.create({
      userId: new mongoose.Types.ObjectId(userId),
      provider: 'anamorphic_sandbox',
      providerConsentId: consentHandle,
      institutionName,
      status: 'pending',
      consentExpiry: expiry,
      dataSharingPurposes: [
        'Personal Finance Management',
        'Fraud & Anomaly Intelligence',
        purposeDescription || 'Smart Transaction Analytics'
      ],
      metadata: {
        environment: 'sandbox',
        notice: 'Zero credential harvesting. Connects via Account Aggregator consent artifact.'
      }
    });

    // Create audit log ConsentRecord
    const consentRecord = await ConsentRecord.create({
      userId: new mongoose.Types.ObjectId(userId),
      connectionId: connection._id,
      consentHandle,
      provider: 'FinovaX Account Aggregator Sandbox (RBI Framework)',
      status: 'INITIATED',
      purposeCode: '101',
      purposeDescription: purposeDescription || 'Personal Financial Management and Automated Statement Aggregation for FinovaX',
      consentExpiry: expiry,
      fiTypesRequested: ['DEPOSIT', 'TERM_DEPOSIT'],
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json({
      status: 'success',
      message: 'Account Aggregator consent artifact generated. User redirection required.',
      data: {
        consentHandle,
        connectionId: connection._id,
        consentRecordId: consentRecord._id,
        redirectUrl: `/bank-connection?consentHandle=${consentHandle}`,
        validityExpiry: expiry,
        purposes: connection.dataSharingPurposes
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/bank-connections/consent-callback
 * @desc    Simulate/handle the Account Aggregator authorization callback
 * @access  Private
 */
export async function handleConsentCallback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { consentHandle, action = 'approve' } = req.body;

    const consent = await ConsentRecord.findOne({ consentHandle, userId });
    if (!consent) {
      return next(new AppError('Consent request not found or unauthorized', 404));
    }

    if (action === 'approve') {
      consent.status = 'APPROVED';
      await consent.save();

      // Create linked sample bank account with masked details
      const bankAccount = await BankAccount.create({
        userId: new mongoose.Types.ObjectId(userId),
        bankName: consent.provider.includes('SBI') ? 'State Bank of India' : 'HDFC Bank',
        accountNumberMasked: `XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
        accountType: 'savings',
        currency: 'INR',
        currentBalance: 45250.75,
        availableBalance: 45250.75,
        isPrimary: true,
        status: 'active',
        lastSyncedAt: new Date()
      });

      if (consent.connectionId) {
        await BankConnection.findByIdAndUpdate(consent.connectionId, {
          status: 'active',
          $push: { accountsLinked: bankAccount._id }
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Account Aggregator consent granted. Bank account linked successfully.',
        data: {
          consentStatus: 'APPROVED',
          accountLinked: bankAccount
        }
      });
    } else {
      consent.status = 'REJECTED';
      await consent.save();

      if (consent.connectionId) {
        await BankConnection.findByIdAndUpdate(consent.connectionId, {
          status: 'failed'
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Consent was declined by user.',
        data: { consentStatus: 'REJECTED' }
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/bank-connections/:id/revoke
 * @desc    Revoke user consent for a bank connection
 * @access  Private
 */
export async function revokeConsent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const connection = await BankConnection.findOne({ _id: id, userId });
    if (!connection) {
      return next(new AppError('Bank connection not found', 404));
    }

    connection.status = 'revoked';
    await connection.save();

    await ConsentRecord.updateMany(
      { connectionId: connection._id, userId },
      { status: 'REVOKED', revokedAt: new Date() }
    );

    await BankAccount.updateMany(
      { _id: { $in: connection.accountsLinked }, userId },
      { status: 'disconnected' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Bank connection and consent revoked successfully.'
    });
  } catch (error) {
    next(error);
  }
}

