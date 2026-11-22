import mongoose, { Schema, Document, Types } from 'mongoose';

export type ConnectionProvider = 'setu_aa' | 'onemoney_aa' | 'finvu_aa' | 'anamorphic_sandbox' | 'manual';
export type ConnectionStatus = 'pending' | 'active' | 'expired' | 'revoked' | 'failed';

export interface IBankConnection extends Document {
  userId: Types.ObjectId;
  provider: ConnectionProvider;
  providerConsentId?: string;
  institutionId?: string;
  institutionName: string;
  status: ConnectionStatus;
  consentExpiry?: Date;
  accountsLinked: Types.ObjectId[];
  dataSharingPurposes: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BankConnectionSchema = new Schema<IBankConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    provider: {
      type: String,
      enum: ['setu_aa', 'onemoney_aa', 'finvu_aa', 'anamorphic_sandbox', 'manual'],
      required: true,
      default: 'anamorphic_sandbox'
    },
    providerConsentId: {
      type: String,
      trim: true,
      default: ''
    },
    institutionId: {
      type: String,
      trim: true,
      default: ''
    },
    institutionName: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'revoked', 'failed'],
      default: 'pending'
    },
    consentExpiry: {
      type: Date
    },
    accountsLinked: [
      {
        type: Schema.Types.ObjectId,
        ref: 'BankAccount'
      }
    ],
    dataSharingPurposes: {
      type: [String],
      default: ['Personal Finance Management', 'Fraud Anomaly Detection', 'Spending Analytics']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

BankConnectionSchema.index({ userId: 1, provider: 1 });

export const BankConnection = mongoose.model<IBankConnection>('BankConnection', BankConnectionSchema);

