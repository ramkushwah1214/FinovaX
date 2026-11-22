export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash' | 'Statement Import' | 'Google Pay';

export interface Transaction {
  id: string;
  _id?: string;
  title: string;
  merchant?: string;
  amount: number;
  currency?: string;
  type: TransactionType;
  direction?: 'debit' | 'credit';
  transactionType?: string;
  category: string;
  subcategory?: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod | string;
  referenceId?: string;
  balance?: number;
  importBatchId?: string;
  categorizationStatus?: 'predicted' | 'rule_based' | 'manual' | 'unclassified';
  userReviewedStatus?: boolean;
  fraudReviewStatus?: 'clean' | 'suspicious' | 'flagged' | 'resolved';
  anomalyScore?: number;
  duplicateStatus?: 'none' | 'possible_duplicate' | 'confirmed_duplicate';
  description: string;
  createdAt?: string;
}

export interface Budget {
  id: string;
  _id?: string;
  category: string;
  allocated: number;
  limitAmount?: number;
  spent: number;
  month?: number;
  year?: number;
  period?: string;
  color?: string;
}

export interface FinancialGoal {
  id: string;
  _id?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: string;
  status?: 'in_progress' | 'completed' | 'cancelled';
  color?: string;
}

export type BillFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type BillStatus = 'paid' | 'pending' | 'overdue';

export interface Bill {
  id: string;
  _id?: string;
  title: string;
  name?: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  frequency: BillFrequency;
  status: BillStatus;
  provider: string;
  autoDebit: boolean;
}

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertResolution = 'pending_review' | 'resolved_legitimate' | 'confirmed_fraud' | 'resolved_fraud';

export interface FraudAlert {
  id: string;
  _id?: string;
  transactionId?: string;
  transactionTitle: string;
  amount: number;
  date?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reason: string;
  reasons?: string[];
  status: AlertResolution;
  flaggedFeatures?: string[];
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isSimulated?: boolean;
  suggestedAction?: {
    label: string;
    path: string;
  };
}

export interface UserProfile {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  avatar?: string;
  monthlyIncome: number;
  notifications: {
    fraudAlerts: boolean;
    budgetThresholds: boolean;
    billReminders: boolean;
    weeklyReports: boolean;
  };
  createdAt?: string;
}

export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  totalTransactions: number;
  pendingBillsCount: number;
  unresolvedFraudCount: number;
  summary?: any;
}

export interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
  count?: number;
  color?: string;
}

export interface ReportCategoryItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  totalSpent?: number;
  transactionCount?: number;
}

export interface ReportSummary {
  grossInflow: number;
  grossOutflow: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  range?: string;
  startDate?: string | null;
  endDate: string;
  totalIncome?: number;
  totalExpenses?: number;
  topCategory?: string;
  categories?: ReportCategoryItem[];
  monthlyBreakdown?: {
    month: string;
    income: number;
    expenses: number;
  }[];
}

// --- New Staged Statements & Import Types ---
export interface StagedTransaction {
  id?: string;
  date: string;
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

export interface StatementImport {
  _id: string;
  id?: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'pdf' | 'gpay_pdf';
  fileSize: number;
  source: 'bank_statement' | 'gpay';
  bankName: string;
  status: 'preview_ready' | 'confirmed' | 'cancelled' | 'failed';
  totalRecords: number;
  importedCount: number;
  duplicateCount: number;
  stagedTransactions?: StagedTransaction[];
  confirmedAt?: string;
  createdAt: string;
}

// --- Bank Connection & Account Aggregator Types ---
export interface BankAccount {
  _id: string;
  bankName: string;
  accountNumberMasked: string;
  accountType: 'savings' | 'current' | 'credit_card' | 'wallet';
  currency: string;
  currentBalance: number;
  availableBalance?: number;
  isPrimary: boolean;
  status: 'active' | 'inactive' | 'disconnected';
  lastSyncedAt?: string;
}

export interface ConsentRecord {
  _id: string;
  consentHandle: string;
  provider: string;
  status: 'INITIATED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  purposeDescription: string;
  consentExpiry: string;
  fiTypesRequested: string[];
  createdAt: string;
}

export interface BankConnection {
  _id: string;
  provider: string;
  providerConsentId?: string;
  institutionName: string;
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'failed';
  consentExpiry?: string;
  accountsLinked?: BankAccount[];
  dataSharingPurposes?: string[];
  createdAt: string;
}

// --- AI Models, Forecasting & Segmentation Types ---
export interface ModelStatusItem {
  name: string;
  model_type: string;
  is_ready: boolean;
  status: string;
  evaluation_metrics: Record<string, any>;
  last_trained?: string;
  dataset_source?: string;
}

export interface SpendingForecastPoint {
  month: string;
  predictedAmount: number;
  lowerBound: number;
  upperBound: number;
}

export interface SpendingForecastData {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  modelUsed: string;
  horizonMonths: number;
  historicalAverage: number;
  forecasts: SpendingForecastPoint[];
  disclaimer: string;
  monthsEvaluated?: number;
  history?: Array<{ month: string; amount: number }>;
}

export interface SpendingSegmentationData {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  persona: string;
  clusterId: number;
  features?: {
    monthlyAvgSpend: number;
    essentialRatio: number;
    discretionaryRatio: number;
    transactionFrequency: number;
    savingsRate: number;
  };
  clusterMetrics?: Record<string, any>;
  recommendations: string[];
}
