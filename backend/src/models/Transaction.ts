import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund' | 'cash' | 'atm' | 'upi' | 'other';
export type TransactionDirection = 'debit' | 'credit';
export type TransactionSource = 'manual' | 'bank_statement' | 'gpay' | 'account_aggregator';
export type CategorizationStatus = 'predicted' | 'rule_based' | 'manual' | 'unclassified';
export type DuplicateStatus = 'none' | 'possible_duplicate' | 'confirmed_duplicate';
export type FraudReviewStatus = 'clean' | 'suspicious' | 'flagged' | 'resolved';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  accountId?: Types.ObjectId;
  accountReference?: string;
  source: TransactionSource;
  title: string;
  merchant?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  direction: TransactionDirection;
  transactionType: TransactionType;
  category: string;
  subcategory?: string;
  date: Date;
  paymentMethod: string;
  referenceId?: string; // Bank UTR or UPI reference
  balance?: number; // Account balance after transaction if available
  importBatchId?: Types.ObjectId;
  categorizationStatus: CategorizationStatus;
  userReviewedStatus: boolean;
  fraudReviewStatus: FraudReviewStatus;
  anomalyScore?: number;
  duplicateStatus: DuplicateStatus;
  duplicateMatchId?: Types.ObjectId;
  description?: string;
  rawRecord?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: false,
      index: true
    },
    accountReference: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['manual', 'bank_statement', 'gpay', 'account_aggregator'],
      default: 'manual',
      index: true
    },
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    merchant: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      validate: {
        validator: (v: number) => Number.isFinite(v) && !isNaN(v),
        message: 'Amount must be a valid, finite number'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Transaction type must be either income or expense'
      },
      required: [true, 'Transaction type is required']
    },
    direction: {
      type: String,
      enum: ['debit', 'credit'],
      default: function (this: ITransaction) {
        return this.type === 'income' ? 'credit' : 'debit';
      }
    },
    transactionType: {
      type: String,
      enum: ['income', 'expense', 'transfer', 'refund', 'cash', 'atm', 'upi', 'other'],
      default: function (this: ITransaction) {
        return this.type === 'income' ? 'income' : 'expense';
      }
    },
    category: {
      type: String,
      required: [true, 'Transaction category is required'],
      trim: true
    },
    subcategory: {
      type: String,
      trim: true,
      default: ''
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true,
      default: 'UPI'
    },
    referenceId: {
      type: String,
      trim: true,
      default: ''
    },
    balance: {
      type: Number,
      default: undefined
    },
    importBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'StatementImport',
      required: false
    },
    categorizationStatus: {
      type: String,
      enum: ['predicted', 'rule_based', 'manual', 'unclassified'],
      default: 'manual'
    },
    userReviewedStatus: {
      type: Boolean,
      default: false
    },
    fraudReviewStatus: {
      type: String,
      enum: ['clean', 'suspicious', 'flagged', 'resolved'],
      default: 'clean'
    },
    anomalyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    duplicateStatus: {
      type: String,
      enum: ['none', 'possible_duplicate', 'confirmed_duplicate'],
      default: 'none'
    },
    duplicateMatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: false
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    rawRecord: {
      type: Schema.Types.Mixed,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// High performance compound indexes
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, type: 1, category: 1, date: -1 });
TransactionSchema.index({ userId: 1, referenceId: 1 });
TransactionSchema.index({ userId: 1, importBatchId: 1 });
TransactionSchema.index({ userId: 1, duplicateStatus: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
