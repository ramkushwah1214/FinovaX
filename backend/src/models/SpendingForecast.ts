import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IForecastPoint {
  month: string; // e.g. "2026-12"
  predictedAmount: number;
  lowerConfidenceBound: number;
  upperConfidenceBound: number;
  historicalBaseline?: number;
}

export interface ISpendingForecast extends Document {
  userId: Types.ObjectId;
  generatedAt: Date;
  modelUsed: string;
  horizonMonths: number;
  dataPointsUsed: number;
  historicalMonthlyAverage: number;
  forecastPoints: IForecastPoint[];
  categoryBreakdownForecast?: Array<{
    category: string;
    predictedAmount: number;
  }>;
  accuracyEstimate?: string;
  disclaimer: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpendingForecastSchema = new Schema<ISpendingForecast>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    modelUsed: {
      type: String,
      default: 'FinovaX XGBoost Time-Series Regressor & Rolling AR'
    },
    horizonMonths: {
      type: Number,
      default: 3
    },
    dataPointsUsed: {
      type: Number,
      required: true
    },
    historicalMonthlyAverage: {
      type: Number,
      required: true
    },
    forecastPoints: [
      {
        month: { type: String, required: true },
        predictedAmount: { type: Number, required: true },
        lowerConfidenceBound: { type: Number, required: true },
        upperConfidenceBound: { type: Number, required: true },
        historicalBaseline: { type: Number }
      }
    ],
    categoryBreakdownForecast: [
      {
        category: { type: String },
        predictedAmount: { type: Number }
      }
    ],
    accuracyEstimate: {
      type: String,
      default: 'RMSE evaluated on historical chronological splits'
    },
    disclaimer: {
      type: String,
      default: 'Spending projections are statistical forecasts based on observed past trends and should not be considered guaranteed financial outcomes.'
    }
  },
  {
    timestamps: true
  }
);

SpendingForecastSchema.index({ userId: 1, generatedAt: -1 });

export const SpendingForecast = mongoose.model<ISpendingForecast>('SpendingForecast', SpendingForecastSchema);

