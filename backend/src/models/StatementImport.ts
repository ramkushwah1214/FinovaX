import mongoose, { Schema, Document, Types } from 'mongoose';

export type StatementFileType = 'csv' | 'xlsx' | 'pdf' | 'gpay_pdf';
export type ImportStatus = 'preview_ready' | 'confirmed' | 'cancelled' | 'failed';

export interface IStagedTransaction {
  id?: string;
  date: Date;
  title: string;
  merchant?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  direction: 'debit' | 'credit';
  transactionType: string;
  category: string;
  subcategory?: string;
  referenceId?: string;
  balance?: number;
  paymentMethod: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  existingTransactionId?: string;
  categorizationConfidence: number;
  categorizationSource: 'ml' | 'rule_based' | 'default';
  description?: string;
  userExcluded?: boolean;
}

export interface IStatementImport extends Document {
  userId: Types.ObjectId;
  fileName: string;
  fileType: StatementFileType;
  fileSize: number;
  source: 'bank_statement' | 'gpay';
  bankName?: string;
  status: ImportStatus;
  totalRecords: number;
  importedCount: number;
  duplicateCount: number;
  stagedTransactions: IStagedTransaction[];
  errorMessage?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StagedTransactionSchema = new Schema<IStagedTransaction>(
  {
    id: { type: String },
    date: { type: Date, required: true },
    title: { type: String, required: true },
    merchant: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    type: { type: String, enum: ['income', 'expense'], required: true },
    direction: { type: String, enum: ['debit', 'credit'], required: true },
    transactionType: { type: String, default: 'expense' },
    category: { type: String, default: 'Other Expenses' },
    subcategory: { type: String, default: '' },
    referenceId: { type: String, default: '' },
    balance: { type: Number },
    paymentMethod: { type: String, default: 'Statement Import' },
    isDuplicate: { type: Boolean, default: false },
    duplicateReason: { type: String, default: '' },
    existingTransactionId: { type: String, default: '' },
    categorizationConfidence: { type: Number, default: 0.5 },
    categorizationSource: { type: String, enum: ['ml', 'rule_based', 'default'], default: 'rule_based' },
    description: { type: String, default: '' },
    userExcluded: { type: Boolean, default: false }
  },
  { _id: false }
);

const StatementImportSchema = new Schema<IStatementImport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['csv', 'xlsx', 'pdf', 'gpay_pdf'],
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    source: {
      type: String,
      enum: ['bank_statement', 'gpay'],
      required: true
    },
    bankName: {
      type: String,
      default: 'Generic Statement'
    },
    status: {
      type: String,
      enum: ['preview_ready', 'confirmed', 'cancelled', 'failed'],
      default: 'preview_ready',
      index: true
    },
    totalRecords: {
      type: Number,
      default: 0
    },
    importedCount: {
      type: Number,
      default: 0
    },
    duplicateCount: {
      type: Number,
      default: 0
    },
    stagedTransactions: [StagedTransactionSchema],
    errorMessage: {
      type: String,
      default: ''
    },
    confirmedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

StatementImportSchema.index({ userId: 1, createdAt: -1 });

export const StatementImport = mongoose.model<IStatementImport>('StatementImport', StatementImportSchema);

