import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingDown,
  ShoppingBag,
  Store,
  Layers,
  Calendar,
  Filter
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

const EXPENSE_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#8B5CF6', '#EC4899'];

export const Expenses: React.FC = () => {
  const { transactions, userProfile } = useFinance();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' && t.transactionType !== 'transfer');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedCategory === 'all') return expenseTransactions;
    return expenseTransactions.filter(t => t.category === selectedCategory);
  }, [expenseTransactions, selectedCategory]);

  const totalExpenses = useMemo(() => {
    return expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [expenseTransactions]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTransactions.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenseTransactions]);

  const topMerchants = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    expenseTransactions.forEach(t => {
      const merchant = t.merchant || t.title;
      if (!map[merchant]) map[merchant] = { total: 0, count: 0 };
      map[merchant].total += t.amount;
      map[merchant].count += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [expenseTransactions]);

  const monthlyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTransactions.forEach(t => {
      const month = t.date.substring(0, 7);
      map[month] = (map[month] || 0) + t.amount;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));
  }, [expenseTransactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <TrendingDown className="w-6 h-6 text-red-500" />
          <span>Expenses & Outflows</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed breakdown of consumer spending across food, utilities, shopping, travel, and subscriptions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Outflow</p>
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-2">
            {formatCurrency(totalExpenses, userProfile.currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{expenseTransactions.length} total debits analyzed</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Outflow Category</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {categoryBreakdown[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {categoryBreakdown[0] ? formatCurrency(categoryBreakdown[0].value, userProfile.currency) : 'No data'}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Merchant</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2 truncate">
            {topMerchants[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {topMerchants[0] ? `${formatCurrency(topMerchants[0].total, userProfile.currency)} (${topMerchants[0].count} orders)` : 'No data'}
          </p>
        </Card>
      </div>

      {/* Visual Analytics */}
      {expenseTransactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-red-500" />
              <span>Monthly Spending Outflow Trend</span>
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val), userProfile.currency), 'Expense']} />
                  <Bar dataKey="amount" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Category Allocation</span>
            </h2>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val), userProfile.currency)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Top Merchants Card */}
      {topMerchants.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <Store className="w-4 h-4 text-slate-500" />
            <span>Top Outflow Merchants & Vendors</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {topMerchants.map((m, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{m.name}</p>
                <p className="text-base font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(m.total, userProfile.currency)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{m.count} transactions</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filterable Table */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Recorded Expenses ({filteredTransactions.length})
          </h2>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Filter Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Categories</option>
              {categoryBreakdown.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="No Expenses Found"
            description="No expense transactions matching your selection. Import statement files or add records manually."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Merchant / Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 text-right">Debit Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id || tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(tx.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      <div>{tx.title}</div>
                      {tx.merchant && tx.merchant !== tx.title && (
                        <div className="text-[10px] text-slate-400">{tx.merchant}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="neutral">{tx.category}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{tx.paymentMethod}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(tx.amount, userProfile.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

