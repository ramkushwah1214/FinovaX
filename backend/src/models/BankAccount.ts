import mongoose, { Schema, Document, Types } from 'mongoose';

export type AccountType = 'savings' | 'current' | 'credit_card' | 'wallet' | 'investment';

export interface IBankAccount extends Document {
  userId: Types.ObjectId;
  accountNumberMasked: string;
  bankName: string;
  accountType: AccountType;
  ifsc?: string;
  currency: string;
  currentBalance: number;
  availableBalance?: number;
  institutionLogo?: string;
  isPrimary: boolean;
  status: 'active' | 'inactive' | 'disconnected';
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    accountNumberMasked: {
      type: String,
      required: [true, 'Masked account number is required'],
      trim: true
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true
    },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'credit_card', 'wallet', 'investment'],
      default: 'savings'
    },
    ifsc: {
      type: String,
      trim: true,
      default: ''
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    availableBalance: {
      type: Number,
      default: 0
    },
    institutionLogo: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'disconnected'],
      default: 'active'
    },
    lastSyncedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

BankAccountSchema.index({ userId: 1, bankName: 1 });

export const BankAccount = mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

