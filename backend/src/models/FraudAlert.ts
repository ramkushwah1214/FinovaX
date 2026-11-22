import mongoose, { Schema, Document, Types } from 'mongoose';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'pending_review' | 'resolved_legitimate' | 'confirmed_fraud';

export interface IFraudAlert extends Document {
  userId: Types.ObjectId;
  transactionId?: Types.ObjectId;
  transactionTitle?: string;
  amount?: number;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  status: AlertStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FraudAlertSchema = new Schema<IFraudAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: false
    },
    transactionTitle: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: Number,
      default: 0
    },
    riskScore: {
      type: Number,
      required: [true, 'Risk score is required'],
      min: [0, 'Risk score must be between 0 and 100'],
      max: [100, 'Risk score must be between 0 and 100']
    },
    riskLevel: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      required: [true, 'Risk level is required']
    },
    reasons: {
      type: [String],
      required: [true, 'At least one risk reason is required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one reason must be specified'
      }
    },
    status: {
      type: String,
      enum: ['pending_review', 'resolved_legitimate', 'confirmed_fraud'],
      default: 'pending_review'
    }
  },
  {
    timestamps: true
  }
);

FraudAlertSchema.index({ userId: 1, status: 1 });
FraudAlertSchema.index({ userId: 1, createdAt: -1 });

export const FraudAlert = mongoose.model<IFraudAlert>('FraudAlert', FraudAlertSchema);
