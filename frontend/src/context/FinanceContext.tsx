import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Transaction,
  Budget,
  FinancialGoal,
  Bill,
  FraudAlert,
  UserProfile,
  ChatMessage,
  DashboardSummary,
  CashFlowPoint,
  CategoryExpense,
  BillStatus,
  AlertResolution
} from '../types';
import { api, ApiError } from '../api/client';
import { useAuth } from './AuthContext';
import { formatCurrency } from '../utils/formatters';

interface FinanceContextType {
  // State collections (all from real MongoDB)
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  bills: Bill[];
  fraudAlerts: FraudAlert[];
  userProfile: UserProfile;
  summary: DashboardSummary;
  cashFlow: CashFlowPoint[];
  expensesByCategory: CategoryExpense[];
  chatMessages: ChatMessage[];

  // Status flags
  isLoading: boolean;
  error: string | null;
  isDbUnavailable: boolean;
  isAiThinking: boolean;

  // Real-time calculated aggregates
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  pendingBillsCount: number;
  unresolvedFraudCount: number;

  // CRUD Actions connecting directly to backend
  refreshData: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | '_id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: { category: string; limitAmount: number; month?: number; year?: number }) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: { title: string; targetAmount: number; currentAmount?: number; targetDate: string; category?: string }) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addBill: (bill: { title: string; amount: number; category: string; frequency?: string; dueDate: string; provider?: string; autoDebit?: boolean }) => Promise<void>;
  updateBillStatus: (id: string, status: BillStatus) => Promise<void>;
  resolveFraudAlert: (id: string, resolution: AlertResolution) => Promise<void>;
  sendChatMessage: (question: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const DEFAULT_SUMMARY: DashboardSummary = {
  totalBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savingsRate: 0,
  totalTransactions: 0,
  pendingBillsCount: 0,
  unresolvedFraudCount: 0
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, updateProfile: authUpdateProfile } = useAuth();

  // Financial Data Collections
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryExpense[]>([]);

  // AI Assistant Chat Messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDbUnavailable, setIsDbUnavailable] = useState<boolean>(false);

  const userProfile: UserProfile = user || {
    name: 'Guest User',
    email: '',
    phone: '',
    currency: 'INR',
    monthlyIncome: 0,
    notifications: {
      fraudAlerts: true,
      budgetThresholds: true,
      billReminders: true,
      weeklyReports: false
    }
  };

  // Fetch all real financial records from MongoDB
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setBills([]);
      setFraudAlerts([]);
      setSummary(DEFAULT_SUMMARY);
      setCashFlow([]);
      setExpensesByCategory([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsDbUnavailable(false);

      const [
        summaryRes,
        cashFlowRes,
        expensesCatRes,
        txRes,
        budgetsRes,
        goalsRes,
        billsRes,
        alertsRes
      ] = await Promise.all([
        api.dashboard.getSummary(),
        api.dashboard.getCashFlow(),
        api.dashboard.getExpensesByCategory(),
        api.transactions.getAll({ limit: 100 }),
        api.budgets.getAll(),
        api.goals.getAll(),
        api.recurringPayments.getAll(),
        api.fraudAlerts.getAll()
      ]);

      setSummary(summaryRes.summary || DEFAULT_SUMMARY);
      setCashFlow(cashFlowRes.cashFlow || []);
      setExpensesByCategory(expensesCatRes.categories || []);
      setTransactions(txRes.transactions || []);
      setBudgets(budgetsRes.budgets || []);
      setGoals(goalsRes.goals || []);
      setBills(billsRes.recurringPayments || (billsRes as any).payments || []);
      setFraudAlerts(alertsRes.alerts || []);
    } catch (err: any) {
      console.error('[FinanceContext Error]:', err);
      if (err instanceof ApiError && err.isDbUnavailable) {
        setIsDbUnavailable(true);
      }
      setError(err.message || 'Failed to load financial records from server.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load data on auth change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set initial assistant message based on real data
  useEffect(() => {
    if (isAuthenticated) {
      setChatMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: `Hello ${userProfile.name}! I am connected to your live FinovaX database. Ask me any question regarding your current spending, budget status, or savings goals.`,
          timestamp: 'Live'
        }
      ]);
    } else {
      setChatMessages([
        {
          id: 'unauth-msg',
          sender: 'assistant',
          text: 'Welcome to FinovaX AI Financial Advisor. Please sign in or create an account to access real-time financial intelligence from your personal ledger.',
          timestamp: 'Ready'
        }
      ]);
    }
  }, [isAuthenticated, userProfile.name]);

  // Computed Financial Metrics
  const totalIncome = summary.totalIncome;
  const totalExpenses = summary.totalExpenses;
  const netBalance = summary.totalBalance;
  const savingsRate = summary.savingsRate;
  const pendingBillsCount = summary.pendingBillsCount;
  const unresolvedFraudCount = summary.unresolvedFraudCount;

  // Memoized Actions to preserve referential stability and prevent cascading component re-renders
  const addTransaction = useCallback(async (txData: Omit<Transaction, 'id' | '_id'>) => {
    try {
      setError(null);
      await api.transactions.create(txData);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
      throw err;
    }
  }, [refreshData]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.transactions.delete(id);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
      throw err;
    }
  }, [refreshData]);

  const addBudget = useCallback(async (budgetData: { category: string; limitAmount: number; month?: number; year?: number }) => {
    try {
      setError(null);
      await api.budgets.create(budgetData);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to create budget');
      throw err;
    }
  }, [refreshData]);

  const deleteBudget = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.budgets.delete(id);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete budget');
      throw err;
    }
  }, [refreshData]);

  const addGoal = useCallback(async (goalData: { title: string; targetAmount: number; currentAmount?: number; targetDate: string; category?: string }) => {
    try {
      setError(null);
      await api.goals.create(goalData);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to create goal');
      throw err;
    }
  }, [refreshData]);

  const contributeToGoal = useCallback(async (id: string, amount: number) => {
    try {
      setError(null);
      await api.goals.contribute(id, amount);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to contribute to goal');
      throw err;
    }
  }, [refreshData]);

  const deleteGoal = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.goals.delete(id);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete goal');
      throw err;
    }
  }, [refreshData]);

  const addBill = useCallback(async (billData: { title: string; amount: number; category: string; frequency?: string; dueDate: string; provider?: string; autoDebit?: boolean }) => {
    try {
      setError(null);
      await api.recurringPayments.create({
        title: billData.title,
        amount: billData.amount,
        category: billData.category,
        frequency: billData.frequency,
        dueDate: billData.dueDate,
        provider: billData.provider,
        autoDebit: billData.autoDebit
      });
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to create recurring obligation');
      throw err;
    }
  }, [refreshData]);

  const updateBillStatus = useCallback(async (id: string, status: BillStatus) => {
    try {
      setError(null);
      await api.recurringPayments.update(id, { status });
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to update bill status');
      throw err;
    }
  }, [refreshData]);

  const resolveFraudAlert = useCallback(async (id: string, resolution: AlertResolution) => {
    try {
      setError(null);
      await api.fraudAlerts.updateStatus(id, resolution);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve fraud alert');
      throw err;
    }
  }, [refreshData]);

  const updateUserProfile = useCallback(async (profileUpdate: Partial<UserProfile>) => {
    try {
      setError(null);
      await authUpdateProfile(profileUpdate);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  }, [authUpdateProfile]);

  // State-aware Assistant reasoning against actual MongoDB data
  const sendChatMessage = (userQuestion: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userQuestion,
      timestamp: 'Just now'
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsAiThinking(true);

    setTimeout(() => {
      const q = userQuestion.toLowerCase();
      let responseText = '';
      let action: { label: string; path: string } | undefined;

      if (!isAuthenticated) {
        responseText = 'You are currently browsing as a guest. Please sign in or register an account so I can analyze your financial database records.';
      } else if (transactions.length === 0) {
        responseText = `You currently have **0 recorded transactions** in your database. Once you record your income and expenses, I can analyze your top spending categories, budget variances, and savings pace.`;
        action = { label: 'Add First Transaction', path: '/transactions' };
      } else if (q.includes('spend the most') || q.includes('highest expense') || q.includes('where did i spend')) {
        if (expensesByCategory.length > 0) {
          const top = expensesByCategory[0];
          responseText = `Based on your actual records for this month, your highest expenditure is in **${top.category}** totaling **${formatCurrency(top.amount, userProfile.currency)}** (${top.count} transactions).`;
          action = { label: 'Review Category Budgets', path: '/budgets' };
        } else {
          responseText = 'You have not recorded any expense transactions for the current month yet.';
        }
      } else if (q.includes('save') || q.includes('how much can i save')) {
        const potentialSavings = Math.max(0, summary.monthlyIncome - summary.monthlyExpenses);
        responseText = `Based on your live monthly inflow (${formatCurrency(summary.monthlyIncome, userProfile.currency)}) and outflow (${formatCurrency(summary.monthlyExpenses, userProfile.currency)}), your estimated monthly net surplus is **${formatCurrency(potentialSavings, userProfile.currency)}** (Savings Rate: **${savingsRate}%**).`;
        action = { label: 'View Financial Goals', path: '/goals' };
      } else if (q.includes('exceed') || q.includes('over budget') || q.includes('categories exceed')) {
        const exceeded = budgets.filter(b => b.spent > b.allocated);
        if (exceeded.length > 0) {
          const list = exceeded.map(b => `• **${b.category}**: ${formatCurrency(b.spent, userProfile.currency)} spent of ${formatCurrency(b.allocated, userProfile.currency)} limit`).join('\n');
          responseText = `Attention: You have exceeded budget limits in **${exceeded.length}** category:\n\n${list}`;
          action = { label: 'Manage Budgets', path: '/budgets' };
        } else if (budgets.length === 0) {
          responseText = 'You have not created any category budgets yet. Creating budgets will allow me to alert you of overspending.';
          action = { label: 'Create First Budget', path: '/budgets' };
        } else {
          responseText = 'None of your active category budgets have exceeded their allocated ceilings.';
        }
      } else if (q.includes('fraud') || q.includes('suspicious') || q.includes('risk') || q.includes('alert')) {
        const pending = fraudAlerts.filter(a => a.status === 'pending_review');
        if (pending.length > 0) {
          responseText = `🚨 You have **${pending.length} unresolved fraud alert(s)** in your ledger. The most critical is for **"${pending[0].transactionTitle}"** with Risk Score **${pending[0].riskScore}/100**.`;
          action = { label: 'Review Fraud Alerts', path: '/fraud' };
        } else {
          responseText = 'No unresolved fraud alerts found in your account records.';
        }
      } else if (q.includes('health') || q.includes('summarize') || q.includes('summary')) {
        responseText = `📊 **FinovaX Financial Health Summary**:\n• **Net Balance**: ${formatCurrency(netBalance, userProfile.currency)}\n• **Savings Rate**: ${savingsRate}%\n• **Monthly Inflow**: ${formatCurrency(summary.monthlyIncome, userProfile.currency)}\n• **Monthly Outflow**: ${formatCurrency(summary.monthlyExpenses, userProfile.currency)}\n• **Total Transactions**: ${transactions.length}\n• **Pending Obligations**: ${pendingBillsCount}\n• **Security Alerts**: ${unresolvedFraudCount} pending`;
        action = { label: 'View Detailed Reports', path: '/reports' };
      } else {
        responseText = `I analyzed your query against your live database records (${transactions.length} transactions, ${budgets.length} budgets, ${goals.length} goals). You can ask about highest spending, budget limits, savings surplus, or overall health.`;
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: responseText,
        timestamp: 'Live Response',
        suggestedAction: action
      };

      setChatMessages(prev => [...prev, botMsg]);
      setIsAiThinking(false);
    }, 400);
  };

  const contextValue = useMemo<FinanceContextType>(() => ({
    transactions,
    budgets,
    goals,
    bills,
    fraudAlerts,
    userProfile,
    summary,
    cashFlow,
    expensesByCategory,
    chatMessages,
    isLoading,
    error,
    isDbUnavailable,
    isAiThinking,
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    pendingBillsCount,
    unresolvedFraudCount,
    refreshData,
    addTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    addGoal,
    contributeToGoal,
    deleteGoal,
    addBill,
    updateBillStatus,
    resolveFraudAlert,
    sendChatMessage,
    updateUserProfile
  }), [
    transactions,
    budgets,
    goals,
    bills,
    fraudAlerts,
    userProfile,
    summary,
    cashFlow,
    expensesByCategory,
    chatMessages,
    isLoading,
    error,
    isDbUnavailable,
    isAiThinking,
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    pendingBillsCount,
    unresolvedFraudCount,
    refreshData,
    addTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    addGoal,
    contributeToGoal,
    deleteGoal,
    addBill,
    updateBillStatus,
    resolveFraudAlert,
    updateUserProfile
  ]);

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
