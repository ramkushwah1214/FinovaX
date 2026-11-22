import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  currency: string;
  monthlyIncome: number;
  notifications: {
    fraudAlerts: boolean;
    budgetThresholds: boolean;
    billReminders: boolean;
    weeklyReports: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR'
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: [0, 'Monthly income cannot be negative']
    },
    notifications: {
      fraudAlerts: { type: Boolean, default: true },
      budgetThresholds: { type: Boolean, default: true },
      billReminders: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
