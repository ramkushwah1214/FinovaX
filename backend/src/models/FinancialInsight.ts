import mongoose, { Schema, Document, Types } from 'mongoose';

export type InsightType = 'spending_spike' | 'top_merchant' | 'budget_warning' | 'savings_opportunity' | 'recurring_alert' | 'cash_flow_trend';
export type InsightSeverity = 'info' | 'warning' | 'critical' | 'positive';

export interface IFinancialInsight extends Document {
  userId: Types.ObjectId;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  category?: string;
  metricValue?: number;
  comparisonPercentage?: number;
  actionableRecommendation?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialInsightSchema = new Schema<IFinancialInsight>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'positive'],
      default: 'info'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    category: {
      type: String,
      trim: true
    },
    metricValue: {
      type: Number
    },
    comparisonPercentage: {
      type: Number
    },
    actionableRecommendation: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

FinancialInsightSchema.index({ userId: 1, createdAt: -1 });

export const FinancialInsight = mongoose.model<IFinancialInsight>('FinancialInsight', FinancialInsightSchema);

