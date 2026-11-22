import mongoose, { Schema, Document, Types } from 'mongoose';

export type GoalStatus = 'in_progress' | 'completed' | 'cancelled';

export interface IFinancialGoal extends Document {
  userId: Types.ObjectId;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  status: GoalStatus;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialGoalSchema = new Schema<IFinancialGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [120, 'Goal title cannot exceed 120 characters']
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be greater than zero'],
      validate: {
        validator: (v: number) => Number.isFinite(v) && !isNaN(v),
        message: 'Target amount must be a valid, finite number'
      }
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
      validate: {
        validator: (v: number) => Number.isFinite(v) && !isNaN(v),
        message: 'Current amount must be a valid, finite number'
      }
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required']
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'cancelled'],
      default: 'in_progress'
    },
    category: {
      type: String,
      trim: true,
      default: 'Savings'
    }
  },
  {
    timestamps: true
  }
);

FinancialGoalSchema.index({ userId: 1, targetDate: 1 });

export const FinancialGoal = mongoose.model<IFinancialGoal>('FinancialGoal', FinancialGoalSchema);
