import {
  Transaction,
  Budget,
  FinancialGoal,
  Bill,
  FraudAlert,
  UserProfile,
  DashboardSummary,
  CashFlowPoint,
  CategoryExpense,
  ReportSummary,
  ReportCategoryItem,
  AlertResolution,
  StatementImport,
  StagedTransaction,
  BankConnection,
  ConsentRecord,
  BankAccount,
  SpendingForecastData,
  SpendingSegmentationData,
  ModelStatusItem
} from '../types';

// Resolve API Base URL:
// In Docker production (Nginx reverse proxy on port 80) and Vite dev mode, route via same-origin '/api'.
// Guard against legacy unexposed port 5000 URLs that fail from browser client execution.
const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.includes(':5000') || envUrl.includes('localhost:5000')) {
    return '/api';
  }
  return envUrl;
};

const BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  statusCode: number;
  code: string;
  isDbUnavailable: boolean;

  constructor(message: string, statusCode = 500, code = 'API_ERROR', isDbUnavailable = false) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isDbUnavailable = isDbUnavailable;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {})
  };

  // If in-memory token exists, attach as Bearer authorization header
  if (inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include' // Always pass HttpOnly secure cookies
    });
  } catch (networkErr: any) {
    throw new ApiError(
      'Cannot connect to FinovaX Backend API server at ' + BASE_URL + '. Please check network connectivity.',
      0,
      'NETWORK_DISCONNECTED',
      false // Only backend 503 DATABASE_UNAVAILABLE should set isDbUnavailable
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { message: response.statusText || 'Unexpected server response format' };
  }

  if (!response.ok) {
    const isDb = response.status === 503 || data.code === 'DATABASE_UNAVAILABLE';
    const message = data.message || 'API request failed';

    if (response.status === 401) {
      inMemoryToken = null;
      try {
        localStorage.removeItem('finovax_token');
      } catch {}
    }

    throw new ApiError(message, response.status, data.code || 'HTTP_' + response.status, isDb);
  }

  return (data.data !== undefined ? data.data : data) as T;
}

export const api = {
  // Health & Readiness
  health: {
    check: async () => {
      try {
        const res = await fetch(`${BASE_URL}/health`);
        const data = await res.json();
        return data;
      } catch {
        return { status: 'disconnected', database: { connected: false, status: 'disconnected', readyState: 0 } };
      }
    }
  },

  // Authentication & Profile
  auth: {
    register: (userData: { name: string; email: string; password: string; currency?: string; monthlyIncome?: number }) =>
      request<{ token: string; user: UserProfile }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),

    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),

    logout: async () => {
      inMemoryToken = null;
      try {
        localStorage.removeItem('finovax_token');
      } catch {}
      return request<{ message: string }>('/auth/logout', {
        method: 'POST'
      });
    },

    getMe: () => request<{ user: UserProfile }>('/auth/me'),

    updateProfile: (profileData: Partial<UserProfile>) =>
      request<{ user: UserProfile }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileData)
      }),

    forgotPassword: (email: string) =>
      request<{ resetToken?: string; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),

    resetPassword: (payload: { token: string; newPassword: string }) =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),

    deleteAccount: (payload: { password: string; confirmText: string }) =>
      request<{ message: string; deleted?: boolean }>('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify(payload)
      })
  },

  // Transactions
  transactions: {
    getAll: (params: {
      type?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      minAmount?: number;
      maxAmount?: number;
      search?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      return request<{
        transactions: Transaction[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/transactions${qs ? `?${qs}` : ''}`);
    },

    getById: (id: string) => request<{ transaction: Transaction }>(`/transactions/${id}`),

    create: (tx: Partial<Transaction>) =>
      request<{ transaction: Transaction }>('/transactions', {
        method: 'POST',
        body: JSON.stringify(tx)
      }),

    update: (id: string, updates: Partial<Transaction>) =>
      request<{ transaction: Transaction }>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/transactions/${id}`, {
        method: 'DELETE'
      }),

    analyze: (id: string) =>
      request<{ transactionId: string; assessment: any }>(`/transactions/${id}/analyze`, {
        method: 'POST'
      })
  },

  // Budgets
  budgets: {
    getAll: (month?: number, year?: number) => {
      const params = new URLSearchParams();
      if (month) params.append('month', String(month));
      if (year) params.append('year', String(year));
      const qs = params.toString();
      return request<{ budgets: Budget[]; month: number; year: number }>(`/budgets${qs ? `?${qs}` : ''}`);
    },

    create: (budget: { category: string; limitAmount: number; month?: number; year?: number }) =>
      request<{ budget: Budget }>('/budgets', {
        method: 'POST',
        body: JSON.stringify(budget)
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/budgets/${id}`, {
        method: 'DELETE'
      })
  },

  // Financial Goals
  goals: {
    getAll: () => request<{ goals: FinancialGoal[] }>('/goals'),

    create: (goal: { title: string; targetAmount: number; currentAmount?: number; targetDate: string; category?: string }) =>
      request<{ goal: FinancialGoal }>('/goals', {
        method: 'POST',
        body: JSON.stringify(goal)
      }),

    contribute: (id: string, amount: number) =>
      request<{ goal: FinancialGoal }>(`/goals/${id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount })
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/goals/${id}`, {
        method: 'DELETE'
      }),

    update: (id: string, updates: Partial<FinancialGoal>) =>
      request<{ goal: FinancialGoal }>(`/goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })
  },

  // Recurring Payments / Bills
  recurringPayments: {
    getAll: () => request<{ recurringPayments: Bill[] }>('/recurring-payments'),

    create: (bill: { title: string; amount: number; category: string; frequency?: string; dueDate: string; provider?: string; autoDebit?: boolean }) =>
      request<{ recurringPayment: Bill }>('/recurring-payments', {
        method: 'POST',
        body: JSON.stringify(bill)
      }),

    updateStatus: (id: string, status: string) =>
      request<{ recurringPayment: Bill }>(`/recurring-payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),

    update: (id: string, updates: Partial<Bill>) =>
      request<{ recurringPayment: Bill }>(`/recurring-payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })
  },

  // Fraud Alerts
  fraudAlerts: {
    getAll: (status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return request<{ alerts: FraudAlert[] }>(`/fraud-alerts${qs}`);
    },

    updateStatus: (id: string, status: AlertResolution) =>
      request<{ alert: FraudAlert }>(`/fraud-alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
  },

  // Statement Ingestion & Duplicate Management
  statements: {
    upload: (file: File, source: 'bank_statement' | 'gpay' = 'bank_statement', bankName?: string) => {
      const formData = new FormData();
      formData.append('statement', file);
      formData.append('source', source);
      if (bankName) formData.append('bankName', bankName);

      return request<{
        importId: string;
        fileName: string;
        fileType: string;
        source: string;
        bankName: string;
        totalRecords: number;
        duplicateCount: number;
        stagedTransactions: StagedTransaction[];
      }>('/statements/upload', {
        method: 'POST',
        body: formData
      });
    },

    getImports: () => request<StatementImport[]>('/statements/imports'),

    getImportById: (id: string) => request<StatementImport>(`/statements/imports/${id}`),

    updateStagedTransaction: (importId: string, index: number, updates: Partial<StagedTransaction>) =>
      request<StagedTransaction>(`/statements/imports/${importId}/staged-transactions/${index}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    confirmImport: (id: string) =>
      request<{ importId: string; importedCount: number; status: string }>(`/statements/imports/${id}/confirm`, {
        method: 'POST'
      }),

    cancelImport: (id: string) =>
      request<{ importId: string; status: string }>(`/statements/imports/${id}/cancel`, {
        method: 'POST'
      })
  },

  // Bank Connections & Account Aggregator
  bankConnections: {
    getAll: () =>
      request<{
        providerMode: string;
        isLiveProviderConfigured: boolean;
        connections: BankConnection[];
        consents: ConsentRecord[];
        accounts: BankAccount[];
      }>('/bank-connections'),

    initiate: (institutionName: string, purposeDescription?: string, validityDays = 180) =>
      request<{
        consentHandle: string;
        connectionId: string;
        consentRecordId: string;
        redirectUrl: string;
        validityExpiry: string;
        purposes: string[];
      }>('/bank-connections/initiate', {
        method: 'POST',
        body: JSON.stringify({ institutionName, purposeDescription, validityDays })
      }),

    consentCallback: (consentHandle: string, action: 'approve' | 'reject') =>
      request<{ consentStatus: string; accountLinked?: BankAccount }>('/bank-connections/consent-callback', {
        method: 'POST',
        body: JSON.stringify({ consentHandle, action })
      }),

    revoke: (id: string) =>
      request<{ message: string }>(`/bank-connections/${id}/revoke`, {
        method: 'POST'
      })
  },

  // AI & ML Microservice Endpoints
  ai: {
    getModelStatus: () => request<{ models: Record<string, ModelStatusItem> }>('/ai/model-status'),

    categorize: (title: string, amount?: number, direction?: 'debit' | 'credit') =>
      request<{ category: string; subcategory: string; confidence: number; source: string; status: string }>('/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ title, amount, direction })
      }),

    fraudCheck: (payload: { amount: number; type: string; category: string; title: string; paymentMethod?: string }) =>
      request<{ is_anomaly: boolean; risk_score: number; risk_level: string; reasons: string[]; confidence: number; disclaimer: string }>('/ai/fraud-check', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),

    getForecast: () => request<SpendingForecastData>('/ai/forecast'),

    getSegmentation: () => request<SpendingSegmentationData>('/ai/segmentation'),

    recordCategoryCorrection: (data: { title: string; category: string; previousCategory?: string }) =>
      request<{ status: string; data: { status: string; totalCorrections?: number } }>('/ai/category-correction', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    retrainModels: (models?: string[]) =>
      request<{ status: string; data: { status: string; retrained?: string[]; message: string } }>('/ai/retrain', {
        method: 'POST',
        body: JSON.stringify({ models })
      })
  },

  // Dashboard & Analytics
  dashboard: {
    getSummary: () => request<DashboardSummary>('/dashboard/summary'),
    getCashFlow: () => request<{ cashFlow: CashFlowPoint[] }>('/dashboard/cashflow'),
    getExpensesByCategory: () => request<{ categories: CategoryExpense[] }>('/dashboard/categories')
  },

  // Reports
  reports: {
    getSummary: (range = '30d') =>
      request<{
        summary: ReportSummary;
      }>(`/reports/summary?range=${range}`),

    getCashFlow: (range = '30d') =>
      request<{
        progression: Array<{ period: string; income: number; expense: number; savings: number }>;
      }>(`/reports/cash-flow?range=${range}`),

    getCategoryBreakdown: (range = '30d') =>
      request<{
        totalExpense: number;
        categories: ReportCategoryItem[];
      }>(`/reports/category-breakdown?range=${range}`),

    getCategories: (range = '30d') =>
      request<{
        totalExpense: number;
        categories: ReportCategoryItem[];
      }>(`/reports/category-breakdown?range=${range}`)
  }
};
