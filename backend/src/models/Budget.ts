import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBudget extends Document {
  userId: Types.ObjectId;
  category: string;
  limitAmount: number;
  month: number; // 1-12
  year: number;  // e.g. 2026
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    category: {
      type: String,
      required: [true, 'Budget category is required'],
      trim: true
    },
    limitAmount: {
      type: Number,
      required: [true, 'Budget limit amount is required'],
      min: [1, 'Budget limit must be at least 1'],
      validate: {
        validator: (v: number) => Number.isFinite(v) && !isNaN(v),
        message: 'Limit amount must be a valid, finite number'
      }
    },
    month: {
      type: Number,
      required: [true, 'Budget month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Budget year is required'],
      min: [2000, 'Year must be a valid 4-digit year'],
      max: [2100, 'Year must be a valid 4-digit year']
    }
  },
  {
    timestamps: true
  }
);

// Ensure a user can only have one budget per category per month/year
BudgetSchema.index({ userId: 1, month: 1, year: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);
