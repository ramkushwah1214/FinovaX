import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  PlusCircle,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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

const COLORS = ['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#F59E0B'];

export const Income: React.FC = () => {
  const { transactions, userProfile } = useFinance();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const incomeTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'income');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedCategory === 'all') return incomeTransactions;
    return incomeTransactions.filter(t => t.category === selectedCategory);
  }, [incomeTransactions, selectedCategory]);

  const totalIncome = useMemo(() => {
    return incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [incomeTransactions]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    incomeTransactions.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [incomeTransactions]);

  const monthlyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    incomeTransactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      map[month] = (map[month] || 0) + t.amount;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));
  }, [incomeTransactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            <span>Income & Cash Inflows</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track verified salary deposits, interest earnings, client invoices, and incoming cash flows.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Inflow</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totalIncome, userProfile.currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{incomeTransactions.length} total income records</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Monthly Salary</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            {formatCurrency(userProfile.monthlyIncome || 0, userProfile.currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Configured in user profile</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Inflow Stream</p>
          <p className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-2">
            {categoryBreakdown[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {categoryBreakdown[0] ? formatCurrency(categoryBreakdown[0].value, userProfile.currency) : 'No data'}
          </p>
        </Card>
      </div>

      {/* Charts Section */}
      {incomeTransactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Monthly Inflow Trends</span>
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val), userProfile.currency), 'Income']}
                  />
                  <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Income Sources Distribution</span>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val), userProfile.currency)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Table Section */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Recorded Income Entries ({filteredTransactions.length})
          </h2>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Filter Source:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Sources</option>
              {categoryBreakdown.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="No Income Records"
            description="You have no recorded cash inflows matching your current filter. Import bank statements to populate income."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Narration / Entity</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Inflow Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id || tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(tx.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{tx.title}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="success">{tx.category}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{tx.paymentMethod}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(tx.amount, userProfile.currency)}
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

