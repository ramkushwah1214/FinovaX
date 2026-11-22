import mongoose, { Schema, Document, Types } from 'mongoose';

export type ConsentStatus = 'INITIATED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface IConsentRecord extends Document {
  userId: Types.ObjectId;
  connectionId?: Types.ObjectId;
  consentHandle: string;
  provider: string;
  status: ConsentStatus;
  purposeCode: string;
  purposeDescription: string;
  dataRange: {
    from: Date;
    to: Date;
  };
  consentExpiry: Date;
  fiTypesRequested: string[];
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentRecordSchema = new Schema<IConsentRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: 'BankConnection',
      required: false
    },
    consentHandle: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    provider: {
      type: String,
      required: true,
      default: 'RBI-Licensed Account Aggregator (Sandbox)'
    },
    status: {
      type: String,
      enum: ['INITIATED', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED'],
      default: 'INITIATED'
    },
    purposeCode: {
      type: String,
      default: '101' // Standard RBI AA purpose code for Wealth / Personal Finance
    },
    purposeDescription: {
      type: String,
      default: 'Personal Financial Management and Automated Statement Aggregation for FinovaX'
    },
    dataRange: {
      from: { type: Date, default: () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      to: { type: Date, default: () => new Date() }
    },
    consentExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days default
    },
    fiTypesRequested: {
      type: [String],
      default: ['DEPOSIT', 'TERM_DEPOSIT', 'RECURRING_DEPOSIT']
    },
    revokedAt: {
      type: Date
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

ConsentRecordSchema.index({ userId: 1, consentHandle: 1 });
ConsentRecordSchema.index({ userId: 1, status: 1 });

export const ConsentRecord = mongoose.model<IConsentRecord>('ConsentRecord', ConsentRecordSchema);

