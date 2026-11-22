import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ShieldAlert,
  ArrowRight,
  Plus,
  Sparkles,
  CalendarCheck2,
  CreditCard,
  AlertTriangle,
  FolderSearch,
  PieChart as PieIcon,
  BarChart3,
  Brain,
  Users,
  Tag
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';
import { PaymentMethod, TransactionType } from '../types';

export const Dashboard: React.FC = () => {
  const {
    transactions,
    budgets,
    bills,
    fraudAlerts,
    userProfile,
    summary,
    cashFlow,
    expensesByCategory,
    netBalance,
    savingsRate,
    unresolvedFraudCount,
    addTransaction,
    error,
    isDbUnavailable,
    isLoading
  } = useFinance();

  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const { showSuccess, showError } = useToast();

  // Add Transaction Modal State
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txCategory, setTxCategory] = useState('Food & Dining');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('UPI');
  const [txDescription, setTxDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Add Transaction Submission
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsAddTxOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    if (!txTitle.trim()) {
      setFormError('Please enter a transaction title');
      return;
    }
    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      await addTransaction({
        title: txTitle.trim(),
        amount: parsedAmount,
        type: txType,
        category: txCategory,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: txPaymentMethod,
        description: txDescription.trim() || 'Manual entry'
      });

      showSuccess(`Transaction "${txTitle.trim()}" saved to ledger`);
      // Reset and close
      setTxTitle('');
      setTxAmount('');
      setTxDescription('');
      setIsAddTxOpen(false);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to save transaction to database';
      setFormError(errMsg);
      showError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pie chart palette
  const pieColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#F43F5E', '#06B6D4', '#EC4899'];
  const formattedPieData = expensesByCategory.map((c, idx) => ({
    name: c.category,
    value: c.amount,
    color: pieColors[idx % pieColors.length]
  }));

  // Check if cashFlow has any non-zero points
  const hasCashFlowData = cashFlow.some(p => p.income > 0 || p.expenses > 0);

  // Top pending fraud alert (if any genuine alert exists)
  const pendingAlert = fraudAlerts.find((a) => a.status === 'pending_review');

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isAuthenticated ? `Welcome, ${userProfile.name}` : 'FinovaX Financial Intelligence'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAuthenticated
              ? 'Real-time ledger overview, automated analytics, and budget monitoring.'
              : 'Sign in to connect your personal financial ledger to MongoDB.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/assistant">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
            >
              Ask AI Assistant
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!isAuthenticated) {
                setIsAuthModalOpen(true);
              } else {
                setIsAddTxOpen(true);
              }
            }}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Global Error Banner if API or Database Fails */}
      {error && !isDbUnavailable && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Security Alert Callout (only if a genuine unresolved alert exists) */}
      {pendingAlert && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500 flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Suspicious Activity Detected
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300">
                  Risk Score: {pendingAlert.riskScore}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                <strong>{pendingAlert.transactionTitle}</strong>: {pendingAlert.reason}
              </p>
            </div>
          </div>
          <Link to="/fraud" className="self-end sm:self-center flex-shrink-0">
            <Button variant="danger" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Review Alert
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      {isLoading && transactions.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Net Balance */}
          <Card hoverable className="bg-gradient-to-br from-blue-500/[0.04] via-transparent to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Net Balance
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(netBalance, userProfile.currency)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant={netBalance >= 0 ? 'success' : 'danger'}>
                {netBalance >= 0 ? 'Positive Surplus' : 'Deficit'}
              </Badge>
              <span className="text-slate-400 text-[11px]">Real database balance</span>
            </div>
          </Card>

          {/* Monthly Inflow */}
          <Card hoverable className="bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Monthly Inflow
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(summary.monthlyIncome, userProfile.currency)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-500 font-medium">
              <span>Current Month Total</span>
            </div>
          </Card>

          {/* Monthly Outflow */}
          <Card hoverable className="bg-gradient-to-br from-rose-500/[0.04] via-transparent to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Monthly Outflow
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(summary.monthlyExpenses, userProfile.currency)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span>Current Month Total</span>
            </div>
          </Card>

          {/* Savings Rate */}
          <Card hoverable className="bg-gradient-to-br from-purple-500/[0.04] via-transparent to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Savings Rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {savingsRate}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, savingsRate)}%` }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* AI Financial Intelligence Engine Suite */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/fraud" className="group">
          <Card hoverable className="h-full border-rose-500/20 hover:border-rose-500/40 transition-all bg-gradient-to-br from-rose-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Fraud Shield
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                IsolationForest
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {unresolvedFraudCount > 0 ? `${unresolvedFraudCount} Flagged Alerts` : 'Zero Anomalies'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Statistical variance and unsupervised risk monitoring.
            </p>
          </Card>
        </Link>

        <Link to="/forecast" className="group">
          <Card hoverable className="h-full border-cyan-500/20 hover:border-cyan-500/40 transition-all bg-gradient-to-br from-cyan-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-500 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                Spending Forecast
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                XGBoost Regressor
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Time-Series Projections
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              3-12 month expense forecasts with confidence intervals.
            </p>
          </Card>
        </Link>

        <Link to="/segmentation" className="group">
          <Card hoverable className="h-full border-purple-500/20 hover:border-purple-500/40 transition-all bg-gradient-to-br from-purple-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Customer Persona
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                KMeans (k=5)
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Behavioral Clustering
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Archetype profiling based on essential vs discretionary habits.
            </p>
          </Card>
        </Link>

        <Link to="/categories" className="group">
          <Card hoverable className="h-full border-indigo-500/20 hover:border-indigo-500/40 transition-all bg-gradient-to-br from-indigo-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Category Studio
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                TF-IDF + Active ML
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              16-Class Intelligence
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Natural language merchant categorization with active retraining.
            </p>
          </Card>
        </Link>
      </div>

      {/* Charts Section: Inflow vs Outflow & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Cashflow */}
        <Card
          className="lg:col-span-2"
          title="Income vs. Expenses Cashflow"
          subtitle="Monthly cashflow progression (Last 6 Months from MongoDB)"
          headerAction={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Expenses
              </span>
            </div>
          }
        >
          <div className="h-64 sm:h-72 w-full pt-2">
            {hasCashFlowData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val) || 0, userProfile.currency)}
                    contentStyle={{
                      backgroundColor: '#090E17',
                      borderColor: '#1E293B',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      padding: '10px 14px'
                    }}
                  />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <BarChart3 className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No cashflow records recorded
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Record income and expense transactions to view your dynamic multi-month trend.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Expense Category Distribution */}
        <Card
          title="Expense Distribution"
          subtitle="Current month breakdown by spending category"
          headerAction={
            <Link to="/budgets" className="text-xs text-emerald-500 hover:underline">
              Budgets
            </Link>
          }
        >
          <div className="h-48 w-full flex items-center justify-center">
            {formattedPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {formattedPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val) || 0, userProfile.currency)}
                    contentStyle={{
                      backgroundColor: '#090E17',
                      borderColor: '#1E293B',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      padding: '10px 14px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6">
                <PieIcon className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
                <p className="text-xs text-slate-400">No expenses recorded for this month</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto pr-1">
            {formattedPieData.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">
                    {cat.name}
                  </span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(cat.value, userProfile.currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Middle Grid: Recent Transactions & Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <Card
          className="lg:col-span-2"
          title="Recent Transactions"
          subtitle="Latest records from your MongoDB ledger"
          headerAction={
            <Link
              to="/transactions"
              className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold inline-flex items-center gap-1"
            >
              View All ({transactions.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {isLoading && transactions.length === 0 ? (
            <SkeletonTable rows={5} />
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-y border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-5">Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {transactions.slice(0, 5).map((t) => (
                    <tr
                      key={t.id || t._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px] block">
                          {t.title}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{t.category}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          <CreditCard className="w-3 h-3" />
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td
                        className={`py-3 px-5 text-right font-bold whitespace-nowrap ${
                          t.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(t.amount, userProfile.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No transactions recorded"
              description="No financial movements have been logged yet. Add your first transaction to populate your real ledger."
              actionLabel="Add Transaction"
              onAction={() => {
                if (!isAuthenticated) setIsAuthModalOpen(true);
                else setIsAddTxOpen(true);
              }}
            />
          )}
        </Card>

        {/* Budget Progress Summary */}
        <Card
          title="Budget Utilization"
          subtitle="Monthly category allocations"
          headerAction={
            <Link
              to="/budgets"
              className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold inline-flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 4).map((b) => {
                const percent = Math.min(100, Math.round((b.spent / b.allocated) * 100));
                const isOver = b.spent > b.allocated;
                return (
                  <div key={b.id || b._id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">{b.category}</span>
                      <span
                        className={`font-semibold ${
                          isOver ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {formatCurrency(b.spent, userProfile.currency)} /{' '}
                        {formatCurrency(b.allocated, userProfile.currency)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-500'
                            : percent > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isOver && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Exceeded by {formatCurrency(b.spent - b.allocated, userProfile.currency)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <FolderSearch className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-400 mb-3">No active monthly budgets configured.</p>
              <Link to="/budgets">
                <Button variant="outline" size="sm">
                  Create First Budget
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid: Upcoming Bills & AI Financial Insight Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Bills & EMIs */}
        <Card
          title="Upcoming Obligations"
          subtitle="Scheduled recurring loan EMIs & utility bills"
          headerAction={
            <Link
              to="/bills"
              className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold inline-flex items-center gap-1"
            >
              All Bills <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {bills.length > 0 ? (
            <div className="space-y-3">
              {bills.slice(0, 3).map((b) => (
                <div
                  key={b.id || b._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CalendarCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{b.title || b.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Due: {formatDate(b.dueDate)} {b.provider ? `• ${b.provider}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatCurrency(b.amount, userProfile.currency)}
                    </div>
                    <Badge
                      variant={
                        b.status === 'paid'
                          ? 'success'
                          : b.status === 'overdue'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              <CalendarCheck2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <span>No upcoming recurring bills or EMIs scheduled.</span>
            </div>
          )}
        </Card>

        {/* AI Financial Health Monitor */}
        <Card
          className="bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10 border-emerald-500/30"
          title="FinovaX Intelligence Monitor"
          subtitle="Real-time financial status assessment"
        >
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Live Ledger Intelligence
                </span>
              </div>
              <p>
                {transactions.length === 0 ? (
                  <span>
                    No transactions have been recorded yet. Add your income and expenses to unlock real-time financial health assessments and cashflow velocity analysis.
                  </span>
                ) : (
                  <span>
                    Your savings rate is currently <strong>{savingsRate}%</strong> with a computed net balance of{' '}
                    <strong>{formatCurrency(netBalance, userProfile.currency)}</strong> across{' '}
                    <strong>{transactions.length}</strong> recorded transaction(s).
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {unresolvedFraudCount > 0
                  ? `⚠️ ${unresolvedFraudCount} Flagged Risk Transaction(s)`
                  : '✅ All security checks clear'}
              </span>
              <Link to="/assistant">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Chat with Advisor
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Transaction Dialog Modal */}
      <Modal
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setFormError('');
        }}
        title="Add New Transaction"
        description="Record an income or expense into your real MongoDB financial ledger."
      >
        <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Salary Deposit or Groceries"
              value={txTitle}
              onChange={(e) => setTxTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="2500"
                min="0.01"
                step="any"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Food & Dining">Food & Dining</option>
                <option value="Housing">Housing</option>
                <option value="Bills & EMIs">Bills & EMIs</option>
                <option value="Shopping">Shopping</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Salary">Salary</option>
                <option value="Freelance">Freelance</option>
                <option value="Investment">Investment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={txPaymentMethod}
                onChange={(e) => setTxPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Context or notes"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddTxOpen(false);
                setFormError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save to Database
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
