import mongoose, { Schema, Document, Types } from 'mongoose';

export type SpendingPersona =
  | 'Low Spending & High Savings'
  | 'Balanced Disciplined Spender'
  | 'High Volume Discretionary'
  | 'Frequent Micro-Transactor'
  | 'High Outflow & Fixed Obligations'
  | 'Emerging Financial Profile';

export interface ISpendingSegment extends Document {
  userId: Types.ObjectId;
  assignedPersona: SpendingPersona;
  clusterId: number;
  features: {
    monthlyAvgSpend: number;
    essentialRatio: number;
    discretionaryRatio: number;
    transactionFrequency: number;
    savingsRate: number;
  };
  clusterMetrics: {
    silhouetteScore: number;
    distanceToCentroid: number;
  };
  recommendations: string[];
  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SpendingSegmentSchema = new Schema<ISpendingSegment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    assignedPersona: {
      type: String,
      required: true
    },
    clusterId: {
      type: Number,
      required: true
    },
    features: {
      monthlyAvgSpend: { type: Number, required: true },
      essentialRatio: { type: Number, required: true },
      discretionaryRatio: { type: Number, required: true },
      transactionFrequency: { type: Number, required: true },
      savingsRate: { type: Number, required: true }
    },
    clusterMetrics: {
      silhouetteScore: { type: Number, default: 0.65 },
      distanceToCentroid: { type: Number, default: 0 }
    },
    recommendations: {
      type: [String],
      default: []
    },
    evaluatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const SpendingSegment = mongoose.model<ISpendingSegment>('SpendingSegment', SpendingSegmentSchema);

