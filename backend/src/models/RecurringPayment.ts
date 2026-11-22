import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentFrequency = 'weekly' | 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface IRecurringPayment extends Document {
  userId: Types.ObjectId;
  name: string;
  amount: number;
  category: string;
  frequency: PaymentFrequency;
  dueDate: Date;
  status: PaymentStatus;
  provider?: string;
  autoDebit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringPaymentSchema = new Schema<IRecurringPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Payment name/title is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      validate: {
        validator: (v: number) => Number.isFinite(v) && !isNaN(v),
        message: 'Amount must be a valid, finite number'
      }
    },
    category: {
      type: String,
      required: [true, 'Payment category is required'],
      trim: true
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly'
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    },
    provider: {
      type: String,
      trim: true,
      default: ''
    },
    autoDebit: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

RecurringPaymentSchema.index({ userId: 1, dueDate: 1 });
RecurringPaymentSchema.index({ userId: 1, status: 1 });

export const RecurringPayment = mongoose.model<IRecurringPayment>('RecurringPayment', RecurringPaymentSchema);
